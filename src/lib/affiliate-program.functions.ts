import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------- helpers ----------------

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
function randomCode(len = 8) {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

// ---------------- ensure code ----------------

export const ensureMyAffiliateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("affiliate_codes")
      .select("code, clicks, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) return existing;

    // Retry on unique collision.
    for (let i = 0; i < 5; i++) {
      const code = randomCode(8);
      const { data, error } = await supabase
        .from("affiliate_codes")
        .insert({ user_id: userId, code })
        .select("code, clicks, created_at")
        .single();
      if (!error && data) return data;
      if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    }
    throw new Error("Could not generate a unique affiliate code");
  });

// ---------------- dashboard data ----------------

export const getMyAffiliateData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: codeRow } = await supabase
      .from("affiliate_codes")
      .select("code, clicks, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    const code = codeRow?.code ?? null;
    const clicks = codeRow?.clicks ?? 0;

    // Signups attributed to this affiliate
    let signups = 0;
    let referrals: Array<{ user_id: string; created_at: string }> = [];
    if (code) {
      const { data: atts } = await supabase
        .from("affiliate_attributions")
        .select("user_id, created_at")
        .eq("affiliate_id", code)
        .order("created_at", { ascending: false });
      referrals = atts ?? [];
      signups = referrals.length;
    }

    // Rewards (one row = one activation = referred user bought the $727 kit)
    const { data: rewards } = await supabase
      .from("affiliate_rewards")
      .select("id, referred_user_id, status, choice, chosen_at, granted_at, created_at")
      .eq("affiliate_user_id", userId)
      .order("created_at", { ascending: false });

    const activations = (rewards ?? []).length;
    const chosen = (rewards ?? []).filter((r) => r.choice).length;

    return {
      code,
      clicks,
      signups,
      activations,
      chosenCount: chosen,
      referrals,
      rewards: rewards ?? [],
    };
  });

// ---------------- choose reward ----------------

export const chooseAffiliateReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        reward_id: z.string().uuid(),
        choice: z.enum(["free_year", "cash_50"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: readErr } = await supabaseAdmin
      .from("affiliate_rewards")
      .select("id, choice, affiliate_user_id")
      .eq("id", data.reward_id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row || row.affiliate_user_id !== userId) throw new Error("Not found");
    if (row.choice) throw new Error("Reward already chosen");

    // Only 'choice' and 'chosen_at' are ever mutated here; status/granted_at
    // are service-role-only and never touched from a user-driven path.
    const { error } = await supabaseAdmin
      .from("affiliate_rewards")
      .update({ choice: data.choice, chosen_at: new Date().toISOString() })
      .eq("id", data.reward_id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
