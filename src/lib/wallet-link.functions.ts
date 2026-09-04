// Server fn for the merchant Chains page: mint a one-time wallet-link code
// that the Nectar wallet redeems via POST /api/public/v1/wallet-link to push
// its xpubs into this store's chain_configs.
//
// SECURITY: minting a wallet-link code is the one action that can replace the
// payout keys of a store, so it is step-up protected. The merchant must first
// request a 6-digit code by email (requestWalletLinkVerification) and pass it
// back to createWalletLinkCode. Codes are single use, expire in 10 minutes,
// and allow 5 wrong guesses before they're burned.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ACTION = "wallet_link";
const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
/** Max codes a user can request per hour. */
const MAX_REQUESTS_PER_HOUR = 5;

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Step 1 — email the signed-in merchant a 6-digit confirmation code. */
export const requestWalletLinkVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ storeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS confirms ownership.
    const { data: store, error: sErr } = await context.supabase
      .from("stores")
      .select("id, name")
      .eq("id", data.storeId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!store) throw new Error("Store not found or not yours.");

    const email = (context.claims as { email?: string })?.email;
    if (!email) throw new Error("No email on this account — contact support.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Simple per-user rate limit.
    const since = new Date(Date.now() - 60 * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("sensitive_action_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("action", ACTION)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_REQUESTS_PER_HOUR) {
      throw new Error("Too many verification codes requested. Try again in an hour.");
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expires_at = new Date(Date.now() + CODE_TTL_MS).toISOString();

    const { error: insErr } = await supabaseAdmin.from("sensitive_action_codes").insert({
      user_id: context.userId,
      store_id: store.id,
      action: ACTION,
      code_hash: sha256(code),
      expires_at,
    });
    if (insErr) throw new Error(insErr.message);

    const { enqueueAppEmail, renderAlertEmail } = await import("@/lib/email/enqueue.server");
    const subject = "Confirm a wallet key change on your store";
    const lines = [
      `Your confirmation code is: ${code}`,
      "",
      `Someone (hopefully you) is changing the wallet keys for "${store.name}".`,
      "This code expires in 10 minutes and can only be used once.",
      "",
      "If this wasn't you, do NOT share this code — your payouts could be redirected. Change your password and contact support immediately.",
    ];
    await enqueueAppEmail({
      to: email,
      subject,
      html: renderAlertEmail(subject, lines),
      text: lines.join("\n"),
      label: "wallet_link_verification",
    });

    return { sent_to: maskEmail(email), expires_at };
  });

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "your email";
  const head = user.slice(0, 2);
  return `${head}${"•".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

/** Step 2 — verify the emailed code, then mint the one-time wallet-link token. */
export const createWalletLinkCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        storeId: z.string().uuid(),
        allowNewWallet: z.boolean().optional().default(false),
        verificationCode: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // RLS confirms ownership.
    const { data: store, error: sErr } = await context.supabase
      .from("stores")
      .select("id, name")
      .eq("id", data.storeId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!store) throw new Error("Store not found or not yours.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: challenge } = await supabaseAdmin
      .from("sensitive_action_codes")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("user_id", context.userId)
      .eq("store_id", store.id)
      .eq("action", ACTION)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!challenge) throw new Error("Request a new email confirmation code.");
    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      throw new Error("That code expired — request a new one.");
    }
    if (challenge.attempts >= MAX_ATTEMPTS) {
      await supabaseAdmin
        .from("sensitive_action_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", challenge.id);
      throw new Error("Too many wrong codes — request a new one.");
    }
    if (!safeEqual(challenge.code_hash, sha256(data.verificationCode))) {
      await supabaseAdmin
        .from("sensitive_action_codes")
        .update({ attempts: challenge.attempts + 1 })
        .eq("id", challenge.id);
      throw new Error("Incorrect code.");
    }

    // Burn the challenge before issuing the link token.
    await supabaseAdmin
      .from("sensitive_action_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id);

    const token = base64url(randomBytes(24)); // ~32 chars
    const code_hash = sha256(token);
    const expires_at = new Date(Date.now() + 5 * 60_000).toISOString();

    const { error } = await context.supabase.from("wallet_link_codes").insert({
      store_id: data.storeId,
      code_hash,
      expires_at,
      created_by: context.userId,
      allow_new_wallet: data.allowNewWallet,
    });
    if (error) throw new Error(error.message);

    return {
      token,
      expires_at,
      store_id: store.id,
      store_name: store.name,
      allow_new_wallet: data.allowNewWallet,
    };
  });
