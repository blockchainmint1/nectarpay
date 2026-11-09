// The only way the browser can change a store's wallet keys by hand.
// Emailed 6-digit code (admins always; owners unless it's a brand-new store's
// first key), 2-step login when enabled, and the DB's 4-hour wait for
// replacement keys. Coin on/off and stablecoin toggles pass straight through.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { currentKey, keyChangeNeedsEmailCode, normalizeChainKey } from "@/lib/chain-key-input";

const CHAINS = ["txc", "btc", "eth", "ltc", "bch", "doge", "dash", "tron", "sol", "lightning", "zcu"] as const;

const SaveInput = z.object({
  storeId: z.string().uuid(),
  chain: z.enum(CHAINS),
  /** null = leave the key alone (only on/off and stablecoins change). */
  value: z.string().max(400).nullable(),
  enabled: z.boolean(),
  stables: z.array(z.string().min(2).max(10)).max(12).default([]),
  verificationCode: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email.").optional(),
});

export type SaveChainKeyResult =
  | { status: "code_required" }
  | { status: "saved" }
  | { status: "scheduled"; activatesAt: string };

export const saveChainKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }): Promise<SaveChainKeyResult> => {
    const { authorizeKeyChange } = await import("@/lib/chain-keys.server");
    const { store, actingAsAdmin } = await authorizeKeyChange(context.supabase, context.userId, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows } = await supabaseAdmin
      .from("chain_configs")
      .select("id, chain, xpub, xpub_or_address, pending_xpub, pending_xpub_or_address")
      .eq("store_id", store.id);
    const existing = (rows ?? []).find((r) => r.chain === data.chain) ?? null;

    // Work out the requested key, if any.
    let next: { xpub: string | null; xpub_or_address: string } | null = null;
    if (data.chain === "zcu") {
      if (data.enabled) {
        const eth = (rows ?? []).find((r) => r.chain === "eth");
        const ethKey = eth?.xpub ?? null;
        if (!ethKey) throw new Error("Add your EVM wallet (xpub) first — ZCU uses the same wallet.");
        next = { xpub: ethKey, xpub_or_address: ethKey };
      }
    } else if (data.value !== null) {
      const n = normalizeChainKey(data.chain, data.value);
      if (!n.ok) throw new Error(n.error);
      next = { xpub: n.xpub, xpub_or_address: n.xpub_or_address };
    }

    const keyChanged = next !== null && currentKey(next) !== currentKey(existing)
      && !(existing && currentKey(next) === currentKey({ xpub: existing.pending_xpub, xpub_or_address: existing.pending_xpub_or_address }));
    if (!existing && !next) throw new Error("Enter an xpub or address first.");

    if (keyChanged) {
      const storeHasAnyKey = (rows ?? []).some((r) => currentKey(r) !== null || currentKey({ xpub: r.pending_xpub, xpub_or_address: r.pending_xpub_or_address }) !== null);
      if (keyChangeNeedsEmailCode({ actingAsAdmin, storeHasAnyKey })) {
        if (!data.verificationCode) return { status: "code_required" };
        const { consumeWalletLinkChallenge } = await import("@/lib/wallet-link-challenge.server");
        await consumeWalletLinkChallenge(context.userId, store.id, data.verificationCode);
      }
    }

    const stables = data.chain === "lightning" || data.chain === "zcu" ? [] : Array.from(new Set(data.stables.map((s) => s.toUpperCase())));
    const write = {
      enabled: data.enabled,
      stables,
      ...(keyChanged && next ? { xpub: next.xpub, xpub_or_address: next.xpub_or_address } : {}),
    };
    const { error } = existing
      ? await supabaseAdmin.from("chain_configs").update(write).eq("id", existing.id)
      : await supabaseAdmin.from("chain_configs").insert({
          store_id: store.id,
          chain: data.chain,
          network: "mainnet",
          xpub: next!.xpub,
          xpub_or_address: next!.xpub_or_address,
          enabled: data.enabled,
          stables,
        });
    if (error) throw new Error(error.message || "Save failed.");

    if (keyChanged) {
      const { data: after } = await supabaseAdmin
        .from("chain_configs")
        .select("pending_activates_at")
        .eq("store_id", store.id)
        .eq("chain", data.chain)
        .maybeSingle();
      if (after?.pending_activates_at) return { status: "scheduled", activatesAt: after.pending_activates_at };
    }
    return { status: "saved" };
  });

export const cancelPendingChainKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ storeId: z.string().uuid(), chain: z.enum(CHAINS) }).parse(d))
  .handler(async ({ data, context }) => {
    const { authorizeKeyChange } = await import("@/lib/chain-keys.server");
    const { store } = await authorizeKeyChange(context.supabase, context.userId, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("chain_configs")
      .select("id, chain, xpub, xpub_or_address, pending_xpub, pending_xpub_or_address, pending_activates_at")
      .eq("store_id", store.id)
      .eq("chain", data.chain)
      .maybeSingle();
    if (!row?.pending_activates_at) return { cancelled: false };
    const { error } = await supabaseAdmin
      .from("chain_configs")
      .update({ pending_xpub: null, pending_xpub_or_address: null, pending_requested_at: null, pending_activates_at: null })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("chain_config_audit").insert({
      store_id: store.id,
      chain: row.chain,
      action: "cancelled",
      old_xpub: row.xpub,
      new_xpub: row.pending_xpub,
      old_xpub_or_address: row.xpub_or_address,
      new_xpub_or_address: row.pending_xpub_or_address,
      source: "cancelled_by_user",
    });
    return { cancelled: true };
  });
