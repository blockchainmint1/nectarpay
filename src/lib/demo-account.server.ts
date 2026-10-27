/**
 * Demo accounts.
 *
 * A rep signing a merchant up with a "+demo" email (e.g. rep+demo@nectar-pay.com,
 * or joe+demo3@shop.com) gets an extra email containing a single-use link that
 * permanently erases the whole account — user, stores, invoices, terminals,
 * keys, everything — so nobody has to clean it up by hand after a demo.
 */
import { enqueueAppEmail } from "@/lib/email/enqueue.server";

const APP_ORIGIN = "https://app.nectar-pay.com";

/** True for addresses whose local part carries a "+demo" tag. */
export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const local = email.split("@")[0] ?? "";
  return /\+demo\d*$/i.test(local.trim()) || /\+demo[.\-_]/i.test(local.trim());
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create (once per account) the self-destruct token and email it to the demo
 * address. Safe to call repeatedly — it no-ops when a link already exists.
 */
export async function ensureDemoResetLink(
  userId: string,
  email: string,
): Promise<{ ok: boolean; skipped?: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing } = await supabaseAdmin
    .from("demo_account_resets")
    .select("id")
    .eq("user_id", userId)
    .is("used_at", null)
    .maybeSingle();
  if (existing) return { ok: true, skipped: true };

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const { error } = await supabaseAdmin.from("demo_account_resets").insert({
    user_id: userId,
    email: email.toLowerCase(),
    token_hash: tokenHash,
  });
  if (error) {
    console.error("[demo-account] token insert failed", error.message);
    return { ok: false };
  }

  const url = `${APP_ORIGIN}/demo-reset?token=${token}`;
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#ffffff;color:#1a1a1a;padding:24px;">
<div style="max-width:560px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;padding:24px;">
  <h1 style="margin:0 0 12px;font-size:20px;">Demo account created</h1>
  <p style="font-size:14px;line-height:1.6;color:#444;">
    This account (<strong>${email}</strong>) was created with a <strong>+demo</strong> address,
    so we treat it as a throwaway demo.
  </p>
  <p style="font-size:14px;line-height:1.6;color:#444;">
    When the demo is over, use the button below to permanently erase it — the login,
    the business, every invoice, terminal and API key. This cannot be undone.
  </p>
  <p style="margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;">
      Blow this account up
    </a>
  </p>
  <p style="font-size:12px;color:#888;line-height:1.6;">
    The link works once. Keep it private — anyone with it can delete the demo account.<br/>
    ${url}
  </p>
</div></body></html>`;
  const text = [
    "Demo account created",
    "",
    `This account (${email}) was created with a +demo address, so we treat it as a throwaway demo.`,
    "",
    "When the demo is over, open this one-time link to permanently erase it:",
    url,
    "",
    "This cannot be undone.",
  ].join("\n");

  await enqueueAppEmail({
    to: email,
    subject: "Your demo account — one-click delete link",
    html,
    text,
    label: "demo-account-reset-link",
    idempotencyKey: `demo-reset:${userId}`,
  });

  return { ok: true };
}

export type DemoResetOutcome =
  | { ok: true; email: string; stores: number; invoices: number }
  | { ok: false; reason: "invalid" | "used" | "failed" };

/** Redeem the one-time link: hard-delete the account and everything under it. */
export async function consumeDemoResetToken(token: string): Promise<DemoResetOutcome> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const clean = token.trim().toLowerCase();
  if (!/^[a-f0-9]{32,96}$/.test(clean)) return { ok: false, reason: "invalid" };

  const tokenHash = await sha256Hex(clean);
  const { data: row } = await supabaseAdmin
    .from("demo_account_resets")
    .select("id, user_id, email, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!row) return { ok: false, reason: "invalid" };
  if (row.used_at) return { ok: false, reason: "used" };

  // Count what we're about to remove (everything cascades from the auth user).
  const { data: stores } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("owner_id", row.user_id);
  const storeIds = (stores ?? []).map((s) => s.id);
  let invoices = 0;
  if (storeIds.length) {
    const { count } = await supabaseAdmin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .in("store_id", storeIds);
    invoices = count ?? 0;
  }

  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(row.user_id);
  if (delErr) {
    console.error("[demo-account] delete user failed", delErr.message);
    return { ok: false, reason: "failed" };
  }

  // Anything keyed by the email rather than the user id.
  await supabaseAdmin.from("leads").delete().ilike("email", row.email);
  await supabaseAdmin.from("suppressed_emails").delete().ilike("email", row.email);

  await supabaseAdmin
    .from("demo_account_resets")
    .update({
      used_at: new Date().toISOString(),
      deleted_summary: { stores: storeIds.length, invoices },
    })
    .eq("id", row.id);

  return { ok: true, email: row.email, stores: storeIds.length, invoices };
}
