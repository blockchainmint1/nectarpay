// Admin-set ZCU price. ZCU has no public price feed yet (not on CoinMarketCap
// or CoinGecko), so an admin sets the USD price; checkout refuses ZCU while
// no price is set. Stored in rates_cache like every other coin.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
  return supabaseAdmin;
}

export const getZcuPrice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context.userId);
    const { data } = await sb.from("rates_cache").select("rate, fetched_at").eq("chain", "zcu").eq("fiat", "USD").maybeSingle();
    const { count } = await sb.from("chain_configs").select("id", { count: "exact", head: true }).eq("chain", "zcu").eq("enabled", true);
    return { rate: data ? Number(data.rate) : null, updatedAt: data?.fetched_at ?? null, storesOn: count ?? 0 };
  });

export const setZcuPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ rate: z.number().positive().max(1_000_000) }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = await assertAdmin(context.userId);
    const { error } = await sb.from("rates_cache").upsert(
      { chain: "zcu", fiat: "USD", rate: data.rate, fetched_at: new Date().toISOString() },
      { onConflict: "chain,fiat" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
