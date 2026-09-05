// Lightning Network support (Option 2: self-hosted shared LND node).
//
// Flow
//   1. Checkout picks "lightning" → we ask the shared LND node for a BOLT-11
//      invoice sized in sats from the locked USD rate. The bolt11 string is
//      stored in invoices.address (that's what the QR renders).
//   2. A cron tick polls open lightning_invoices by payment hash. On SETTLE we
//      record a transaction + settle the Nectar invoice exactly like an
//      on-chain credit, and append the sats to the merchant's ledger
//      (lightning_credits).
//   3. A second cron tick sweeps each merchant's unswept sats out of the
//      node's on-chain wallet to their own Bitcoin address once the balance
//      crosses their threshold. Nectar never holds a merchant balance longer
//      than one sweep cycle.

import { getUsdRate } from "@/lib/rates.functions";
import {
  lndAddInvoice,
  lndCancelInvoice,
  lndLookupInvoice,
  lndOnchainBalanceSats,
  lndSendCoins,
  lightningConfigured,
} from "@/lib/chains/lightning.server";

const SATS_PER_BTC = 100_000_000;
/** Leave a little on the node so channel fees / anchors stay funded. */
const SWEEP_RESERVE_SATS = 25_000;
const SWEEP_FEE_SAT_PER_VBYTE = 2;

export interface LightningInvoiceResult {
  paymentRequest: string;
  paymentHash: string;
  amountSats: number;
  btcAmount: number;
  rate: number;
  expiresAt: string;
}

/**
 * Create the Lightning payment request for a store invoice.
 * `invoiceId` may be null when the invoice row doesn't exist yet — the watcher
 * back-fills nothing in that case, so callers should link it as soon as they
 * have the id (see linkLightningInvoice).
 */
export async function createLightningInvoice(
  storeId: string,
  fiatAmount: number,
  invoiceId: string | null,
  ttlSeconds = 900,
  memo = "Nectar.Pay",
): Promise<LightningInvoiceResult> {
  if (!lightningConfigured()) {
    throw new Error("Lightning is not available right now.");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: cfg } = await supabaseAdmin
    .from("chain_configs")
    .select("id, enabled, xpub_or_address")
    .eq("store_id", storeId)
    .eq("chain", "lightning")
    .maybeSingle();
  if (!cfg || !cfg.enabled) throw new Error("Lightning is not configured for this store.");

  const rate = await getUsdRate("btc").catch(() => 0);
  if (!rate || rate <= 0) throw new Error("Could not fetch exchange rate.");

  const btcAmount = Number((fiatAmount / rate).toFixed(8));
  const amountSats = Math.max(1, Math.round(btcAmount * SATS_PER_BTC));

  const created = await lndAddInvoice(amountSats, memo, ttlSeconds);

  const { error } = await supabaseAdmin.from("lightning_invoices").insert({
    store_id: storeId,
    invoice_id: invoiceId,
    payment_hash: created.paymentHash,
    payment_request: created.paymentRequest,
    amount_sats: amountSats,
    state: "open",
    expires_at: created.expiresAt,
  });
  if (error) throw new Error(error.message);

  return {
    paymentRequest: created.paymentRequest,
    paymentHash: created.paymentHash,
    amountSats,
    btcAmount: amountSats / SATS_PER_BTC,
    rate,
    expiresAt: created.expiresAt,
  };
}

/** Attach a Nectar invoice id to a previously created Lightning request. */
export async function linkLightningInvoice(paymentRequest: string, invoiceId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("lightning_invoices")
    .update({ invoice_id: invoiceId })
    .eq("payment_request", paymentRequest)
    .is("invoice_id", null);
}

export interface LightningTickResult {
  checked: number;
  settled: number;
  cancelled: number;
}

/** Poll every open Lightning request and settle the ones that got paid. */
export async function runLightningWatcherTick(): Promise<LightningTickResult> {
  const out: LightningTickResult = { checked: 0, settled: 0, cancelled: 0 };
  if (!lightningConfigured()) return out;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { recordTransaction, settleInvoice } = await import("@/lib/watcher.functions");

  const { data: open } = await supabaseAdmin
    .from("lightning_invoices")
    .select("id, store_id, invoice_id, payment_hash, amount_sats, expires_at")
    .eq("state", "open")
    .limit(200);
  if (!open?.length) return out;

  for (const li of open) {
    out.checked++;
    let state;
    try {
      state = await lndLookupInvoice(li.payment_hash);
    } catch (e) {
      console.error("[lightning] lookup failed:", (e as Error).message);
      continue;
    }

    if (state.state === "SETTLED") {
      const paidSats = state.amtPaidSats || Number(li.amount_sats);
      await supabaseAdmin
        .from("lightning_invoices")
        .update({
          state: "settled",
          amount_paid_sats: paidSats,
          settled_at: state.settledAt ?? new Date().toISOString(),
        })
        .eq("id", li.id);

      await supabaseAdmin.from("lightning_credits").insert({
        store_id: li.store_id,
        invoice_id: li.invoice_id,
        lightning_invoice_id: li.id,
        amount_sats: paidSats,
      });

      if (li.invoice_id) {
        const { data: inv } = await supabaseAdmin
          .from("invoices")
          .select("id, fiat_amount")
          .eq("id", li.invoice_id)
          .maybeSingle();
        if (inv) {
          await recordTransaction(
            inv.id,
            li.payment_hash,
            paidSats / SATS_PER_BTC,
            1,
            null,
            true,
            null,
          );
          await settleInvoice(inv.id, 0, Number(inv.fiat_amount));
        }
      }
      out.settled++;
      continue;
    }

    const expired = li.expires_at ? new Date(li.expires_at).getTime() < Date.now() : false;
    if (state.state === "CANCELED" || expired) {
      if (state.state !== "CANCELED") {
        await lndCancelInvoice(li.payment_hash).catch(() => undefined);
      }
      await supabaseAdmin.from("lightning_invoices").update({ state: "cancelled" }).eq("id", li.id);
      out.cancelled++;
    }
  }

  return out;
}

export interface LightningSweepResult {
  stores: number;
  swept: number;
  totalSats: number;
}

/**
 * Resolve where a store's sweep should go.
 * 1. If the merchant linked a Bitcoin xpub (via Beekeeper / wallet-link or
 *    manual entry), derive a FRESH address from it per sweep and advance the
 *    index — same rotation policy as regular BTC invoices.
 * 2. Otherwise fall back to the fixed payout address on the Lightning config.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveSweepAddress(
  supabaseAdmin: any,
  storeId: string,
  manualAddress: string | null | undefined,
): Promise<string | null> {
  const { data: btcCfg } = await supabaseAdmin
    .from("chain_configs")
    .select("id, xpub, xpub_or_address, next_address_index")
    .eq("store_id", storeId)
    .eq("chain", "btc")
    .eq("enabled", true)
    .maybeSingle();

  const xpub: string | null = btcCfg?.xpub ?? btcCfg?.xpub_or_address ?? null;
  if (btcCfg && xpub && /^(xpub|ypub|zpub|vpub|tpub)/.test(xpub)) {
    try {
      const { deriveBtcLikeAddress } = await import("@/lib/chains/derive.server");
      const { getNetwork } = await import("@/lib/chains/networks");
      const net = getNetwork("btc");
      if (!net || net.kind !== "btc-like") throw new Error("btc network missing");
      const index = Math.max(1, Number(btcCfg.next_address_index ?? 0));
      const address = deriveBtcLikeAddress(xpub, net, index);
      await supabaseAdmin
        .from("chain_configs")
        .update({ next_address_index: index + 1, next_derivation_index: index + 1 })
        .eq("id", btcCfg.id);
      return address;
    } catch (e) {
      console.warn(`[lightning] BTC xpub derivation failed for store ${storeId}, falling back to manual address:`, (e as Error).message);
    }
  }

  const manual = manualAddress?.trim();
  return manual || null;
}

/**
 * Pay each merchant their unswept Lightning sats on-chain, from the node's
 * wallet, once they cross their own threshold. Credits are marked with the
 * sweep id so a retry never pays twice.
 */
export async function runLightningSweepTick(): Promise<LightningSweepResult> {
  const out: LightningSweepResult = { stores: 0, swept: 0, totalSats: 0 };
  if (!lightningConfigured()) return out;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: credits } = await supabaseAdmin
    .from("lightning_credits")
    .select("id, store_id, amount_sats")
    .is("sweep_id", null)
    .limit(2000);
  if (!credits?.length) return out;

  const byStore = new Map<string, { ids: string[]; sats: number }>();
  for (const c of credits) {
    const e = byStore.get(c.store_id) ?? { ids: [], sats: 0 };
    e.ids.push(c.id);
    e.sats += Number(c.amount_sats);
    byStore.set(c.store_id, e);
  }

  let nodeBalance = await lndOnchainBalanceSats().catch(() => 0);

  for (const [storeId, agg] of byStore.entries()) {
    out.stores++;

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id, ln_sweep_threshold_sats")
      .eq("id", storeId)
      .maybeSingle();
    const threshold = Number(store?.ln_sweep_threshold_sats ?? 100_000);
    if (agg.sats < threshold) continue;

    const { data: cfg } = await supabaseAdmin
      .from("chain_configs")
      .select("id, xpub_or_address, enabled")
      .eq("store_id", storeId)
      .eq("chain", "lightning")
      .maybeSingle();
    if (!cfg?.enabled) continue;

    // Payout target: prefer a FRESH address derived from the merchant's
    // linked Bitcoin xpub (the same wallet Beekeeper handed us — nothing for
    // the merchant to copy/paste). Fall back to the fixed payout address on
    // the Lightning config when no BTC xpub is linked.
    const payoutAddress = await resolveSweepAddress(supabaseAdmin, storeId, cfg.xpub_or_address);
    if (!payoutAddress) continue;

    if (nodeBalance - SWEEP_RESERVE_SATS < agg.sats) {
      console.warn(`[lightning] node balance too low to sweep store ${storeId}`);
      continue;
    }

    const { data: sweep, error: sweepErr } = await supabaseAdmin
      .from("lightning_sweeps")
      .insert({
        store_id: storeId,
        amount_sats: agg.sats,
        address: payoutAddress,
        status: "pending",
      })
      .select("id")
      .single();
    if (sweepErr || !sweep) {
      console.error("[lightning] sweep insert failed:", sweepErr?.message);
      continue;
    }

    // Claim the credits BEFORE broadcasting so a crash can't double-pay.
    await supabaseAdmin
      .from("lightning_credits")
      .update({ sweep_id: sweep.id })
      .in("id", agg.ids);

    try {
      const txid = await lndSendCoins(payoutAddress, agg.sats, SWEEP_FEE_SAT_PER_VBYTE);
      await supabaseAdmin
        .from("lightning_sweeps")
        .update({ status: "sent", txid, completed_at: new Date().toISOString() })
        .eq("id", sweep.id);
      nodeBalance -= agg.sats;
      out.swept++;
      out.totalSats += agg.sats;
    } catch (e) {
      const msg = (e as Error).message;
      console.error("[lightning] sweep failed:", msg);
      await supabaseAdmin
        .from("lightning_sweeps")
        .update({ status: "failed", error: msg.slice(0, 500) })
        .eq("id", sweep.id);
      // Release the credits so the next tick can retry.
      await supabaseAdmin
        .from("lightning_credits")
        .update({ sweep_id: null })
        .in("id", agg.ids);
    }
  }

  return out;
}
