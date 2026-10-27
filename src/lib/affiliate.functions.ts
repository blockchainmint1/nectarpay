import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AFFILIATE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

const inputSchema = z.object({
  affiliate_id: z.string().regex(AFFILIATE_ID_RE).optional(),
  landing_path: z.string().max(500).nullish(),
  first_seen_at: z.string().datetime().nullish(),
  utm_source: z.string().max(120).nullish(),
  utm_medium: z.string().max(120).nullish(),
  utm_campaign: z.string().max(120).nullish(),
  referrer: z.string().max(500).nullish(),
});

/**
 * First-touch attribution: records the affiliate the user came from.
 * If a row already exists for this user, it is left alone.
 * Also mirrors affiliate_id to profiles for quick reporting joins.
 */
export const recordAffiliateAttribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: account, error: accountError } = await context.supabase.auth.getUser();
    if (accountError || !account.user?.email) return { recorded: false, reason: "no_email" as const };
    const { data: pendingEvent } = await supabaseAdmin.from("hme_signup_events").select("sent_at").eq("user_id", userId).maybeSingle();
    const isNewSignup = Date.now() - Date.parse(account.user.created_at) < 5 * 60 * 1000;
    if (isNewSignup || (pendingEvent && !pendingEvent.sent_at)) {
      const { reportHmeSignup } = await import("./hme-signup.server");
      await reportHmeSignup(supabaseAdmin, userId, account.user.email, data.affiliate_id ?? null);
    }
    if (!data.affiliate_id) return { recorded: false, reason: "no_referral" as const };

    // First-touch: skip if we already have an attribution row.
    const { data: existing } = await supabaseAdmin
      .from("affiliate_attributions")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) return { recorded: false, reason: "already_attributed" as const };

    const { error } = await supabaseAdmin.from("affiliate_attributions").insert({
      user_id: userId,
      affiliate_id: data.affiliate_id,
      landing_path: data.landing_path ?? null,
      first_seen_at: data.first_seen_at ?? null,
      utm_source: data.utm_source ?? null,
      utm_medium: data.utm_medium ?? null,
      utm_campaign: data.utm_campaign ?? null,
      referrer: data.referrer ?? null,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("profiles")
      .update({ affiliate_id: data.affiliate_id })
      .eq("user_id", userId);

    return { recorded: true };
  });

