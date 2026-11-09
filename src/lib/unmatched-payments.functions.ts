// Payments that reached a store's single EVM main address but matched no sale
// (wrong amount, two sales looked alike, or the merchant's own transfer).
// The watcher parks them; the merchant applies one to a sale or dismisses it.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

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

    // Unpaid sales on the same main address from the last few days.
    const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const { data: sales } = await supabase
      .from("invoices")
      .select("id, address, token_symbol, chain, crypto_amount, fiat_amount, fiat_currency, status, description, created_at")
      .eq("store_id", data.store_id)
      .eq("address_index", 0)
      .in("chain", ["eth", "base", "bsc"])
      .in("status", ["pending", "detected", "underpaid", "expired"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100);
    return { payments, sales: sales ?? [] };
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
      .select("id, store_id, address, address_index, token_symbol, fiat_amount, rate, status")
      .eq("id", data.invoice_id)
      .maybeSingle();
    if (!inv || inv.store_id !== pay.store_id) throw new Error("Sale not found.");
    if (inv.address_index !== 0 || (inv.address ?? "").toLowerCase() !== pay.address.toLowerCase()) {
      throw new Error("That sale was paid to a different address.");
    }
    if ((inv.token_symbol ?? "").toUpperCase() !== (pay.token_symbol ?? "").toUpperCase()) {
      throw new Error("That sale was for a different coin.");
    }
    if (!["pending", "detected", "underpaid", "expired"].includes(inv.status)) {
      throw new Error("That sale is already closed.");
    }

    // Live confirmation count straight from the chain.
    const { EVM_NETWORKS } = await import("@/lib/chains/networks");
    const net = EVM_NETWORKS.find((n) => n.symbol === pay.chain);
    const key = process.env.ALCHEMY_API_KEY;
    if (!net || !key) throw new Error("Can't check this network right now.");
    const { getBlockNumber } = await import("@/lib/chains/evm.server");
    const tip = await getBlockNumber(net, key);
    const confirmations = pay.block_height ? Math.max(0, tip - Number(pay.block_height) + 1) : 0;
    if (confirmations < net.confirmationsRequired) {
      throw new Error("This payment is still confirming on the blockchain. Try again in a few minutes.");
    }

    const { recordTransaction, settleInvoice } = await import("@/lib/watcher.functions");
    const blockMs = pay.block_time ? Date.parse(pay.block_time) : null;
    const recorded = await recordTransaction(
      inv.id, pay.tx_hash, Number(pay.amount), confirmations,
      pay.block_height ? Number(pay.block_height) : null, true, pay.token_symbol, blockMs,
    );
    if (!recorded) throw new Error("This payment happened before the sale, or already paid another sale.");
    const usd = pay.token_symbol ? Number(pay.amount) : Number(pay.amount) * Number(inv.rate ?? 0);
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
