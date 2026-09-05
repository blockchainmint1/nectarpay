// Merchant-facing helper: derive the store's first Bitcoin receive address
// (m/<receive>/0) from the saved BTC xpub, used to pre-fill the Lightning
// payout address field.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ storeId: z.string().uuid() });

export const getStoreBtcPayoutAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<{ address: string | null }> => {
    // RLS scopes chain_configs to stores the caller owns.
    const { data: row, error } = await context.supabase
      .from("chain_configs")
      .select("xpub, xpub_or_address")
      .eq("store_id", data.storeId)
      .eq("chain", "btc")
      .maybeSingle();
    if (error) throw new Error(error.message);

    const xpub = (row?.xpub || row?.xpub_or_address || "").trim();
    if (!xpub) return { address: null };

    const { deriveBtcLikeAddress, isXpubLike } = await import("./chains/derive.server");
    if (!isXpubLike(xpub)) return { address: null };
    const { BTC_NETWORK } = await import("./chains/networks");
    try {
      return { address: deriveBtcLikeAddress(xpub, BTC_NETWORK, 0) };
    } catch {
      return { address: null };
    }
  });
