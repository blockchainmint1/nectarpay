// Payments that reached a store wallet but no sale took: a wrong amount on the
// shared EVM main address, or (any coin, any address) a payment the watcher
// missed or that arrived up to an hour after its sale expired. The watcher
// parks them; the merchant applies one to a sale on the same address and coin,
// or dismisses it.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { BtcLikeNetwork, ChainKind } from "@/lib/chains/networks";

const PAY_COLS = "id, store_id, chain, address, tx_hash, token_symbol, amount, confirmations, block_time, reason, created_at";

export const listUnmatchedPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: payments, error } = await supabase
      .from("unmatched_payments")
      .select(PAY_COLS)
      .eq("store_id", data.store_id)
      .is("resolved_invoice_id", null)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    if (!payments?.length) return { payments: [], sales: [] };

    // Hide anything a sale has since taken (it is no longer waiting).
    const { data: taken } = await supabase
      .from("transactions").select("tx_hash").in("tx_hash", payments.map((p) => p.tx_hash));
    const takenSet = new Set((taken ?? []).map((t) => t.tx_hash));
    const waiting = payments.filter((p) => !takenSet.has(p.tx_hash));
    if (!waiting.length) return { payments: [], sales: [] };

    // Unpaid or expired sales on the same addresses from the last two weeks.
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const { data: sales } = await supabase
      .from("invoices")
      .select("id, address, token_symbol, chain, crypto_amount, fiat_amount, fiat_currency, status, description, created_at")
      .eq("store_id", data.store_id)
      .in("address", Array.from(new Set(waiting.map((p) => p.address))))
      .in("status", ["pending", "detected", "underpaid", "expired"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    return { payments: waiting, sales: sales ?? [] };
  });

async function assertManager(supabase: SupabaseClient<Database>, storeId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpc = supabase.rpc.bind(supabase) as any;
  const [{ data: owns }, { data: level }] = await Promise.all([
    rpc("owns_store", { _store_id: storeId }),
    rpc("store_access_level", { _store_id: storeId }),
  ]);
  if (owns !== true && Number(level ?? 0) < 2) throw new Error("Only the store's owner or a manager can do this.");
}

export const applyUnmatchedPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ payment_id: z.string().uuid(), invoice_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: pay } = await supabase
      .from("unmatched_payments")
      .select(`${PAY_COLS}, block_height, resolved_invoice_id, dismissed_at`)
      .eq("id", data.payment_id)
      .maybeSingle();
    if (!pay || pay.resolved_invoice_id || pay.dismissed_at) throw new Error("That payment is no longer waiting.");
    await assertManager(supabase, pay.store_id);

    const { data: inv } = await supabase
      .from("invoices")
      .select("id, store_id, chain, address, token_symbol, fiat_amount, rate, status")
      .eq("id", data.invoice_id)
      .maybeSingle();
    if (!inv || inv.store_id !== pay.store_id) throw new Error("Sale not found.");
    if ((inv.address ?? "").toLowerCase() !== pay.address.toLowerCase()) {
      throw new Error("That sale was paid to a different address.");
    }
    const token = (pay.token_symbol ?? "").toUpperCase();
    if ((inv.token_symbol ?? "").toUpperCase() !== token) {
      throw new Error("That sale was for a different coin.");
    }
    const evmChains = ["eth", "base", "bsc"];
    const sameNetwork = token && evmChains.includes(pay.chain)
      ? evmChains.includes(inv.chain ?? "") // a stablecoin may arrive on any EVM network
      : inv.chain === pay.chain;
    if (!sameNetwork) throw new Error("That sale was for a different coin.");
    if (!["pending", "detected", "underpaid", "expired"].includes(inv.status)) {
      throw new Error("That sale is already closed.");
    }

    // Re-read the payment from the blockchain: amount and live confirmations.
    const { getNetwork, isBtcLikeChain } = await import("@/lib/chains/networks");
    let amount = Number(pay.amount);
    let confirmations = 0;
    let blockMs = pay.block_time ? Date.parse(pay.block_time) : null;
    if (evmChains.includes(pay.chain)) {
      const { EVM_NETWORKS } = await import("@/lib/chains/networks");
      const net = EVM_NETWORKS.find((n) => n.symbol === pay.chain);
      const key = process.env.ALCHEMY_API_KEY;
      if (!net || !key) throw new Error("Can't check this network right now.");
      const { getBlockNumber } = await import("@/lib/chains/evm.server");
      const tip = await getBlockNumber(net, key);
      confirmations = pay.block_height ? Math.max(0, tip - Number(pay.block_height) + 1) : 0;
      if (confirmations < net.confirmationsRequired) {
        throw new Error("This payment is still confirming on the blockchain. Try again in a few minutes.");
      }
    } else if (isBtcLikeChain(pay.chain)) {
      const { getAddressTxs, getTipHeight, extractIncoming } = await import("@/lib/chains/btc-like.server");
      const { extractOmniIncoming } = await import("@/lib/chains/omni.server");
      const { getOmniToken } = await import("@/lib/chains/networks");
      const net = getNetwork(pay.chain as ChainKind) as BtcLikeNetwork;
      const [tip, txs] = await Promise.all([getTipHeight(net), getAddressTxs(net, pay.address)]);
      const omni = token ? getOmniToken(pay.chain, token) : null;
      if (token && !omni) throw new Error("Can't check this coin right now.");
      const credit = omni
        ? extractOmniIncoming(txs, pay.address, omni.propertyId, omni.decimals, tip)
            .filter((c) => c.txid === pay.tx_hash).map((c) => ({ human: c.amount, confirmations: c.confirmations, blockTime: c.blockTime }))
        : extractIncoming(txs, pay.address, tip)
            .filter((c) => c.txid === pay.tx_hash).map((c) => ({ human: c.amountSats / 10 ** net.decimals, confirmations: c.confirmations, blockTime: c.blockTime }));
      if (!credit.length) throw new Error("We couldn't find this payment on the blockchain right now. Try again shortly.");
      amount = credit.reduce((sum, c) => sum + c.human, 0);
      confirmations = Math.min(...credit.map((c) => c.confirmations));
      const bt = credit[0]?.blockTime;
      if (bt != null) blockMs = bt * 1000;
      if (confirmations < Math.max(1, net.confirmationsRequired)) {
        throw new Error("This payment is still confirming on the blockchain. Try again in a few minutes.");
      }
    } else {
      throw new Error("Can't check this network right now.");
    }

    const { recordTransaction, settleInvoice } = await import("@/lib/watcher.functions");
    const recorded = await recordTransaction(
      inv.id, pay.tx_hash, amount, confirmations,
      pay.block_height ? Number(pay.block_height) : null, true, pay.token_symbol, blockMs,
    );
    if (!recorded) throw new Error("This payment happened before the sale, or already paid another sale.");
    let rate = Number(inv.rate ?? 0);
    if (!token && !(rate > 0)) {
      const { getUsdRate } = await import("@/lib/rates.functions");
      rate = await getUsdRate(pay.chain);
    }
    const usd = token ? amount : amount * rate;
    const settled = await settleInvoice(inv.id, usd, Number(inv.fiat_amount), true);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("unmatched_payments").update({
      resolved_invoice_id: inv.id,
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      updated_at: new Date().toISOString(),
    }).eq("id", pay.id);
    return { status: settled.status };
  });

export const dismissUnmatchedPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ payment_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: pay } = await supabase
      .from("unmatched_payments").select("id, store_id").eq("id", data.payment_id).maybeSingle();
    if (!pay) throw new Error("Payment not found.");
    await assertManager(supabase, pay.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("unmatched_payments")
      .update({ dismissed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", pay.id);
    return { ok: true };
  });
