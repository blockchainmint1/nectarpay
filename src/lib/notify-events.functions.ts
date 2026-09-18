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


export function renderAdminAlertEmail(
  title: string,
  intro: string,
  rows: Array<{ label: string; value: string }>,
  linkHref: string,
  linkLabel: string,
) {
  const details = rows
    .map(
      ({ label, value }) => `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #E7E1D2;font-size:13px;color:#6A7182;vertical-align:top;">${escapeHtml(label)}</td>
        <td align="right" style="padding:12px 0 12px 20px;border-bottom:1px solid #E7E1D2;font-size:13px;font-weight:700;color:#2B3242;vertical-align:top;word-break:break-word;">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#2B3242;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(intro)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#ffffff;"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border:1px solid #E7E1D2;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#0D1B33;padding:24px 32px;border-bottom:4px solid #F6A21E;">
        <div style="font-size:22px;line-height:1;font-weight:900;color:#ffffff;">Nectar<span style="color:#F6A21E;">Pay</span></div>
        <div style="margin-top:8px;font-size:12px;line-height:1.4;color:#B7C0D4;">Private team notification</div>
      </td></tr>
      <tr><td style="padding:36px 32px 30px;background:#ffffff;">
        <div style="font-size:12px;line-height:1.4;font-weight:800;letter-spacing:1.5px;color:#E8880C;">A LITTLE MORE NECTAR IN THE HIVE</div>
        <h1 style="margin:8px 0 10px;font-size:30px;line-height:1.15;color:#0D1B33;">${escapeHtml(title)}</h1>
        <p style="margin:0 0 26px;font-size:16px;line-height:1.55;color:#4B5563;">${escapeHtml(intro)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${details}
        </table>
        <div style="margin-top:28px;text-align:center;">
          <a href="${linkHref}" style="display:inline-block;padding:14px 24px;border-radius:8px;background:#F6A21E;color:#0D1B33;font-size:15px;font-weight:800;text-decoration:none;">${escapeHtml(linkLabel)}</a>
        </div>
        <p style="margin:22px 0 0;text-align:center;font-size:12px;line-height:1.5;color:#6A7182;">Sent by NectarPay because a new account or store was created.</p>
      </td></tr>
      <tr><td style="padding:20px 28px;background:#FAF8F3;border-top:1px solid #E7E1D2;text-align:center;">
        <p style="margin:0 0 7px;font-size:12px;color:#6A7182;">Part of the <a href="https://honest.money" style="color:#B96A00;text-decoration:none;">honest.money ecosystem</a></p>
        <p style="margin:0;font-size:11px;color:#6A7182;"><a href="https://app.nectar-pay.com/terms" style="color:#6A7182;">Terms</a> &nbsp;·&nbsp; <a href="https://app.nectar-pay.com/privacy" style="color:#6A7182;">Privacy</a> &nbsp;·&nbsp; <a href="https://app.nectar-pay.com/manifesto" style="color:#6A7182;">Manifesto</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
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
    const { data: attribution } = await supabaseAdmin
      .from("affiliate_attributions")
      .select("affiliate_id, landing_path, utm_source, utm_medium, utm_campaign, referrer")
      .eq("user_id", u.id)
      .maybeSingle();
    const created = u.created_at
      ? new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC",
        }).format(new Date(u.created_at)) + " UTC"
      : "Unknown";
    const subject = `New signup: ${name || email}`;
    const rows = [
      { label: "Name", value: name || "Not provided" },
      { label: "Email", value: email },
      { label: "Sign-in method", value: provider },
      { label: "Email verified", value: u.email_confirmed_at ? "Yes" : "Not yet" },
      { label: "Account type", value: isDemoEmail(email) ? "Demo" : "Standard" },
      ...(attribution?.affiliate_id
        ? [{ label: "Referred by", value: attribution.affiliate_id }]
        : []),
      ...(attribution?.utm_source
        ? [{ label: "Campaign source", value: attribution.utm_source }]
        : []),
      ...(attribution?.utm_medium
        ? [{ label: "Campaign medium", value: attribution.utm_medium }]
        : []),
      ...(attribution?.utm_campaign
        ? [{ label: "Campaign", value: attribution.utm_campaign }]
        : []),
      ...(attribution?.landing_path
        ? [{ label: "First page", value: attribution.landing_path }]
        : []),
      ...(attribution?.referrer
        ? [{ label: "Referrer", value: attribution.referrer }]
        : []),
      { label: "Created", value: created },
      { label: "User ID", value: u.id },
    ];
    const text = ["A new person just joined NectarPay.", ...rows.map(({ label, value }) => `${label}: ${value}`)].join("\n");
    const html = renderAdminAlertEmail(
      "Someone new joined NectarPay",
      `${name || email} just created an account.`,
      rows,
      "https://app.nectar-pay.com/admin",
      "View in admin",
    );
    await enqueueAdmin(
      supabaseAdmin,
      subject,
      html,
      text,
      "admin-notify-signup",
      `signup:${u.id}`,
    );


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
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(store.owner_id);
    const ownerEmail = userRes?.user?.email ?? "(unknown)";

    // Second chance for the demo self-destruct link, in case the signup
    // notification never fired (offline terminal, closed tab, etc).
    const { isDemoEmail, ensureDemoResetLink } = await import("@/lib/demo-account.server");
    if (userRes?.user?.email && isDemoEmail(userRes.user.email)) {
      await ensureDemoResetLink(store.owner_id, userRes.user.email).catch((e) =>
        console.error("[notify-events] demo reset link failed", e),
      );
    }

    const createdMs = store.created_at ? new Date(store.created_at).getTime() : 0;
    if (Date.now() - createdMs > 10 * 60 * 1000) return { ok: true, skipped: true };

    const subject = `New merchant: ${store.name}`;
    const rows = [
      { label: "Store", value: store.name || "Unnamed store" },
      ...(store.website ? [{ label: "Website", value: store.website }] : []),
      { label: "Currency", value: store.fiat_currency || "Not set" },
      { label: "Owner", value: ownerEmail },
      { label: "Store ID", value: store.id },
    ];
    const text = ["A new merchant store was created.", ...rows.map(({ label, value }) => `${label}: ${value}`)].join("\n");
    const html = renderAdminAlertEmail(
      "A new merchant joined the hive",
      `${store.name || "A new store"} is now getting set up to accept payments with NectarPay.`,
      rows,
      `https://app.nectar-pay.com/admin/merchants`,
      "View merchant",
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
