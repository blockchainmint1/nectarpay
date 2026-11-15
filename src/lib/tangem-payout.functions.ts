// Tap-to-pay (Tangem) USDC payout address. It is a payout destination, so it
// goes through the same gate as wallet keys: full store access, 2-step login,
// an emailed 6-digit code, and the database's 4-hour hold (store_payout_cooloff)
// with an unmutable security alert. Clearing the address is immediate.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export type SavePayoutResult =
  | { status: "code_required" }
  | { status: "cleared" }
  | { status: "unchanged" }
  | { status: "scheduled"; activatesAt: string };

export const getTangemPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ storeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("stores")
      .select("usdc_payout_address_eth, pending_usdc_payout_address_eth, pending_usdc_payout_activates_at")
      .eq("id", data.storeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Store not found or not yours.");
    return {
      current: row.usdc_payout_address_eth ?? null,
      pending: row.pending_usdc_payout_address_eth ?? null,
      activatesAt: row.pending_usdc_payout_activates_at ?? null,
    };
  });

export const saveTangemPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        storeId: z.string().uuid(),
        address: z.string().trim().max(64).nullable(),
        verificationCode: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email.").optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<SavePayoutResult> => {
    const address = data.address ? data.address.trim() : null;
    if (address && !ETH_ADDRESS.test(address)) {
      throw new Error("Enter a valid Ethereum address (0x + 40 hex characters) or leave it blank.");
    }
    const { authorizeKeyChange } = await import("@/lib/chain-keys.server");
    const { store } = await authorizeKeyChange(context.supabase, context.userId, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("stores")
      .select("usdc_payout_address_eth, pending_usdc_payout_address_eth")
      .eq("id", store.id)
      .maybeSingle();
    const current = row?.usdc_payout_address_eth ?? null;
    const pending = row?.pending_usdc_payout_address_eth ?? null;

    if (address === null) {
      if (!current && !pending) return { status: "unchanged" };
      const { error } = await supabaseAdmin.from("stores").update({ usdc_payout_address_eth: null }).eq("id", store.id);
      if (error) throw new Error(error.message);
      return { status: "cleared" };
    }
    if (address.toLowerCase() === (current ?? "").toLowerCase() && !pending) return { status: "unchanged" };

    if (!data.verificationCode) return { status: "code_required" };
    const { consumeWalletLinkChallenge } = await import("@/lib/wallet-link-challenge.server");
    await consumeWalletLinkChallenge(context.userId, store.id, data.verificationCode);

    const { error } = await supabaseAdmin
      .from("stores")
      .update({ usdc_payout_address_eth: address })
      .eq("id", store.id);
    if (error) throw new Error(error.message);
    const { data: after } = await supabaseAdmin
      .from("stores")
      .select("pending_usdc_payout_activates_at")
      .eq("id", store.id)
      .maybeSingle();
    if (!after?.pending_usdc_payout_activates_at) throw new Error("Could not schedule the new payout address.");
    return { status: "scheduled", activatesAt: after.pending_usdc_payout_activates_at };
  });

export const cancelTangemPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        storeId: z.string().uuid(),
        verificationCode: z.string().regex(/^\d{6}$/).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { authorizeKeyChange } = await import("@/lib/chain-keys.server");
    const actor = await authorizeKeyChange(context.supabase, context.userId, data.storeId);
    const { codeRecipient } = await import("@/lib/key-change-code");
    if (codeRecipient(actor) === "owner") {
      if (!data.verificationCode) return { status: "code_required" as const };
      const { consumeWalletLinkChallenge } = await import("@/lib/wallet-link-challenge.server");
      await consumeWalletLinkChallenge(context.userId, actor.store.id, data.verificationCode);
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("stores")
      .update({
        pending_usdc_payout_address_eth: null,
        pending_usdc_payout_requested_at: null,
        pending_usdc_payout_activates_at: null,
      })
      .eq("id", actor.store.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("security_events").insert({
      kind: "payout_address_cancelled",
      store_id: actor.store.id,
      actor_id: context.userId,
      detail: {},
    });
    return { status: "cancelled" as const };
  });
