// Fire-and-forget admin notifications for key business events (new signup,
// new store/merchant). Uses the same Lovable Emails queue as leads.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE_NAME = "NectarPay";
const SENDER_DOMAIN = "notify.nectar-pay.com";
const FROM_DOMAIN = "nectar-pay.com";
const ADMIN_NOTIFY_EMAILS = ["bobby@honest.money", "tim@nectar-pay.com"];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function enqueueAdmin(
  _supabase: unknown,
  subject: string,
  html: string,
  text: string,
  label: string,
  idempotencyKey: string,
) {
  const { enqueueAppEmail } = await import("@/lib/email/enqueue.server");
  for (const to of ADMIN_NOTIFY_EMAILS) {
    const res = await enqueueAppEmail({
      to,
      subject,
      html,
      text,
      label,
      idempotencyKey: `${idempotencyKey}:${to}`,
    });
    if (!res.ok) {
      console.error("[notify-events] send failed", { label, to, error: res.error });
    }
  }
}


function wrap(title: string, rows: string[], linkHref: string, linkLabel: string) {
  const body = rows.map((r) => `<div style="padding:4px 0;color:#ddd;">${r}</div>`).join("");
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b0d;color:#eee;padding:24px;">
<div style="max-width:640px;margin:0 auto;background:#141418;border:1px solid #2a2a30;border-radius:12px;padding:24px;">
  <h1 style="margin:0 0 12px;font-size:18px;color:#f5c542;">${escapeHtml(title)}</h1>
  ${body}
  <p style="margin-top:20px;"><a href="${linkHref}" style="color:#f5c542;">${escapeHtml(linkLabel)} →</a></p>
</div></body></html>`;
}

// ─── New signup notification ────────────────────────────────────────────
// Called from the client right after auth SIGNED_IN when the user's
// created_at is fresh. We double-check server-side to avoid spam.
export const notifyNewSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const u = userRes?.user;
    if (!u) return { ok: false };
    // "+demo" accounts always get their one-time self-destruct link, even if
    // this call arrives late — it is idempotent per account.
    const { isDemoEmail, ensureDemoResetLink } = await import("@/lib/demo-account.server");
    if (u.email && isDemoEmail(u.email)) {
      await ensureDemoResetLink(u.id, u.email).catch((e) =>
        console.error("[notify-events] demo reset link failed", e),
      );
    }
    const createdMs = u.created_at ? new Date(u.created_at).getTime() : 0;
    if (Date.now() - createdMs > 5 * 60 * 1000) {
      // older than 5 minutes — not actually a new signup
      return { ok: true, skipped: true };
    }

    const email = u.email ?? "(no email)";
    const name = (u.user_metadata?.full_name || u.user_metadata?.name || "").toString();
    const provider = (u.app_metadata?.provider || "email").toString();
    const subject = `New signup: ${name || email}`;
    const rows = [
      `Email: ${escapeHtml(email)}`,
      name ? `Name: ${escapeHtml(name)}` : "",
      `Provider: ${escapeHtml(provider)}`,
      `User ID: ${escapeHtml(u.id)}`,
      `Created: ${escapeHtml(u.created_at ?? "")}`,
    ].filter(Boolean);
    const text = rows.join("\n").replace(/<[^>]+>/g, "");
    const html = wrap("New NectarPay signup", rows, "https://app.nectar-pay.com/admin", "Open admin");
    await enqueueAdmin(
      supabaseAdmin,
      subject,
      html,
      text,
      "admin-notify-signup",
      `signup:${u.id}`,
    );

    // "+demo" signups get a one-time self-destruct link so reps can clean up
    // after themselves without us doing it by hand.
    const { isDemoEmail, ensureDemoResetLink } = await import("@/lib/demo-account.server");
    if (u.email && isDemoEmail(u.email)) {
      await ensureDemoResetLink(u.id, u.email).catch((e) =>
        console.error("[notify-events] demo reset link failed", e),
      );
    }
    return { ok: true };
  });

// ─── New store (merchant) notification ─────────────────────────────────
export const notifyNewStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ storeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id, name, website, owner_id, created_at, fiat_currency")
      .eq("id", data.storeId)
      .maybeSingle();
    if (!store || store.owner_id !== context.userId) {
      return { ok: false };
    }
    const createdMs = store.created_at ? new Date(store.created_at).getTime() : 0;
    if (Date.now() - createdMs > 10 * 60 * 1000) return { ok: true, skipped: true };
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(store.owner_id);
    const ownerEmail = userRes?.user?.email ?? "(unknown)";
    const subject = `New merchant: ${store.name}`;
    const rows = [
      `Store: ${escapeHtml(store.name || "")}`,
      store.website ? `Website: ${escapeHtml(store.website)}` : "",
      `Currency: ${escapeHtml(store.fiat_currency || "")}`,
      `Owner: ${escapeHtml(ownerEmail)}`,
      `Store ID: ${escapeHtml(store.id)}`,
    ].filter(Boolean);
    const text = rows.join("\n");
    const html = wrap(
      "New merchant store created",
      rows,
      `https://app.nectar-pay.com/admin/merchants`,
      "Open merchants",
    );
    await enqueueAdmin(
      supabaseAdmin,
      subject,
      html,
      text,
      "admin-notify-store",
      `store:${store.id}`,
    );
    return { ok: true };
  });
