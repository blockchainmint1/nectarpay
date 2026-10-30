import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeCoinId, isTxcAddress } from "@/lib/fast-enroll";

const CSC_LOOKUP = "https://admin.coldstoragecoins.com/api/public/v5/coin-details";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export type CoinCheck =
  | { ok: true; coinId: string; address: string; chain: string | null; product: string | null; taken: boolean }
  | { ok: false; message: string };

async function lookupCoin(coinId: string): Promise<CoinCheck> {
  const res = await fetch(CSC_LOOKUP, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ publicKey: coinId }),
  });
  if (res.status === 404) return { ok: false, message: "No Cold Storage Coin has that ID. Check upper and lower case." };
  if (!res.ok) return { ok: false, message: "Couldn't reach Cold Storage Coins right now. Try again." };
  const body: any = await res.json().catch(() => null);
  const coin = body?.coin ?? body;
  const address: string | undefined = coin?.publicKey;
  if (!address || !isTxcAddress(address)) return { ok: false, message: "That coin isn't a TEXITcoin coin, so it can't receive TSD." };
  return { ok: true, coinId, address, chain: coin?.blockchainName ?? coin?.blockchainCode ?? null, product: body?.displayValues?.name ?? null, taken: false };
}

export const checkFastCoin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ coinId: z.string().max(20) }).parse(d))
  .handler(async ({ data, context }): Promise<CoinCheck> => {
    await assertAdmin(context);
    const coinId = normalizeCoinId(data.coinId);
    if (!coinId) return { ok: false, message: "Coin IDs are exactly 6 letters or numbers." };
    const r = await lookupCoin(coinId);
    if (!r.ok) return r;
    const { data: existing } = await context.supabase.from("fast_enrollments").select("id").eq("coin_id", coinId).maybeSingle();
    return { ...r, taken: !!existing };
  });

const opt = (n: number) => z.string().trim().max(n).optional().transform((v) => v || null);
const Enroll = z.object({
  coinId: z.string().max(20),
  businessName: z.string().trim().min(1).max(120),
  contactName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: opt(40),
  category: opt(80),
  street: opt(200),
  city: opt(120),
  region: opt(120),
  postalCode: opt(20),
  country: opt(120),
  egivingOptIn: z.boolean(),
});

export const submitFastEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Enroll.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const coinId = normalizeCoinId(data.coinId);
    if (!coinId) throw new Error("Coin IDs are exactly 6 letters or numbers.");
    const coin = await lookupCoin(coinId);
    if (!coin.ok) throw new Error(coin.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("fast_enrollments")
      .insert({
        coin_id: coinId,
        tsd_address: coin.address,
        business_name: data.businessName,
        contact_name: data.contactName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        category: data.category,
        street: data.street,
        city: data.city,
        region: data.region,
        postal_code: data.postalCode,
        country: data.country,
        egiving_opt_in: data.egivingOptIn,
        enrolled_by: context.userId,
      })
      .select("id, coin_id, tsd_address")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("That coin is already assigned to another merchant.");
      throw new Error("Couldn't save the enrollment.");
    }
    return row;
  });

export const listFastEnrollments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("fast_enrollments")
      .select("id, coin_id, business_name, city, egiving_opt_in, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });
