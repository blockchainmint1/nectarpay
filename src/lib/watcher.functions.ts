// Main watcher orchestrator. Called by the cron route every minute.
// For each chain_config with an xpub:
//   1) Ensure the next batch of derived addresses exists
//   2) Poll the chain for incoming credits to those addresses
//   3) Match credits to open invoices, mark paid/underpaid, emit notifications & webhooks

import { BTC_NETWORK, TXC_NETWORK, ETH_NETWORK, BASE_NETWORK, TRON_NETWORK, SOL_NETWORK } from "./chains/networks";
import { deriveBtcLikeAddress, deriveEvmAddress, deriveTronAddress } from "./chains/derive.server";
import { extractIncoming, getAddressTxs, getTipHeight } from "./chains/btc-like.server";
import { getBlockNumber, getTransfersTo } from "./chains/evm.server";
import { getTronBlockNumber, getTronTransfersTo } from "./chains/tron.server";
import { getSolanaSlot, getSolanaCreditsTo } from "./chains/solana.server";
import { notifyUser } from "./notify.server";
import { getUsdRate } from "./rates.functions";

const ADDRESS_WINDOW = 20; // BIP44 gap-limit-style lookahead per chain_config

export interface WatcherResult {
  chain: string;
  addresses: number;
  credits: number;
  invoicesUpdated: number;
  error?: string;
}

async function ensureAddresses(
  chainConfigId: string,
  storeId: string,
  xpub: string,
  derive: (i: number) => string,
  startIndex: number,
  endIndex: number,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("derived_addresses")
    .select("address_index")
    .eq("chain_config_id", chainConfigId);
  const have = new Set((existing ?? []).map((r) => r.address_index));
  const rows: { chain_config_id: string; store_id: string; address: string; address_index: number }[] =
    [];
  for (let i = startIndex; i <= endIndex; i++) {
    if (have.has(i)) continue;
    try {
      rows.push({
        chain_config_id: chainConfigId,
        store_id: storeId,
        address: derive(i),
        address_index: i,
      });
    } catch (e) {
      console.error(`derive ${i} failed`, e);
    }
  }
  if (rows.length) {
    await supabaseAdmin.from("derived_addresses").upsert(rows, { onConflict: "address" });
  }
}

async function recordTransaction(
  invoiceId: string,
  txHash: string,
  amount: number,
  confirmations: number,
  blockHeight: number | null,
  isConfirmed: boolean,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("invoice_id", invoiceId)
    .eq("tx_hash", txHash)
    .maybeSingle();
  const now = new Date().toISOString();
  if (existing) {
    await supabaseAdmin
      .from("transactions")
      .update({
        confirmations,
        block_height: blockHeight,
        confirmed_at: isConfirmed ? now : null,
      })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("transactions").insert({
      invoice_id: invoiceId,
      tx_hash: txHash,
      amount,
      confirmations,
      block_height: blockHeight,
      first_seen_at: now,
      confirmed_at: isConfirmed ? now : null,
    });
  }
}

async function settleInvoice(
  invoiceId: string,
  paidAmountUsd: number,
  amountDueUsd: number,
): Promise<{ status: string; changed: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: inv } = await supabaseAdmin
    .from("invoices")
    .select("status, store_id, stores(owner_id)")
    .eq("id", invoiceId)
    .single();
  if (!inv || ["confirmed", "expired", "cancelled"].includes(inv.status)) {
    return { status: inv?.status ?? "unknown", changed: false };
  }

  const isPaid = paidAmountUsd + 0.005 >= amountDueUsd;
  const newStatus: "confirmed" | "underpaid" | typeof inv.status = isPaid
    ? "confirmed"
    : paidAmountUsd > 0
      ? "underpaid"
      : inv.status;
  if (newStatus === inv.status) return { status: newStatus, changed: false };

  await supabaseAdmin
    .from("invoices")
    .update({ status: newStatus })
    .eq("id", invoiceId);

  const ownerId = (inv.stores as { owner_id: string } | null)?.owner_id;
  if (ownerId) {
    await notifyUser(ownerId, {
      event: isPaid ? "invoice_paid" : "invoice_underpaid",
      subject: isPaid ? `Invoice paid · $${amountDueUsd.toFixed(2)}` : `Invoice underpaid`,
      text: isPaid
        ? `Invoice ${invoiceId.slice(0, 8)} was paid in full ($${paidAmountUsd.toFixed(2)} of $${amountDueUsd.toFixed(2)}).`
        : `Invoice ${invoiceId.slice(0, 8)} received only $${paidAmountUsd.toFixed(2)} of $${amountDueUsd.toFixed(2)}.`,
      metadata: { invoiceId },
    });
  }
  return { status: newStatus, changed: true };
}

export async function runWatcherTick(): Promise<WatcherResult[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const results: WatcherResult[] = [];

  const { data: configs } = await supabaseAdmin
    .from("chain_configs")
    .select("*, stores!inner(id, owner_id)")
    .not("xpub", "is", null)
    .eq("enabled", true);

  if (!configs?.length) return results;

  // Group by chain
  const byChain = new Map<string, typeof configs>();
  for (const c of configs) {
    const arr = byChain.get(c.chain) ?? [];
    arr.push(c);
    byChain.set(c.chain, arr);
  }

  for (const [chain, configList] of byChain.entries()) {
    const r: WatcherResult = { chain, addresses: 0, credits: 0, invoicesUpdated: 0 };
    try {
      if (chain === "btc" || chain === "txc") {
        const net = chain === "btc" ? BTC_NETWORK : TXC_NETWORK;
        const tip = await getTipHeight(net);

        for (const cfg of configList) {
          if (!cfg.xpub) continue;
          await ensureAddresses(
            cfg.id,
            cfg.store_id,
            cfg.xpub,
            (i) => deriveBtcLikeAddress(cfg.xpub!, net, i),
            0,
            (cfg.next_address_index ?? 0) + ADDRESS_WINDOW,
          );
        }

        const { data: addrs } = await supabaseAdmin
          .from("derived_addresses")
          .select("address, store_id")
          .in(
            "chain_config_id",
            configList.map((c) => c.id),
          );
        r.addresses = addrs?.length ?? 0;

        for (const a of addrs ?? []) {
          const txs = await getAddressTxs(net, a.address).catch(() => []);
          const credits = extractIncoming(txs, a.address, tip);
          r.credits += credits.length;
          for (const credit of credits) {
            // find matching invoice
            const { data: inv } = await supabaseAdmin
              .from("invoices")
              .select("id, fiat_amount, status")
              .eq("address", a.address)
              .eq("chain", chain)
              .maybeSingle();
            if (!inv) continue;
            const usdRate = await getUsdRate(chain);
            const paidUsd = (credit.amountSats / 10 ** net.decimals) * usdRate;
            const isConfirmed = credit.confirmations >= net.confirmationsRequired;
            await recordTransaction(
              inv.id,
              credit.txid,
              credit.amountSats / 10 ** net.decimals,
              credit.confirmations,
              null,
              isConfirmed,
            );
            const settled = await settleInvoice(inv.id, paidUsd, Number(inv.fiat_amount));
            if (settled.changed) r.invoicesUpdated++;
          }
        }

        await supabaseAdmin
          .from("watcher_cursors")
          .update({
            last_height: tip,
            last_run_at: new Date().toISOString(),
            last_status: "ok",
            last_error: null,
          })
          .eq("chain", chain);
      } else if (chain === "eth" || chain === "base") {
        const net = chain === "eth" ? ETH_NETWORK : BASE_NETWORK;
        const key = process.env.ALCHEMY_API_KEY;
        if (!key) throw new Error("ALCHEMY_API_KEY not configured");
        const tip = await getBlockNumber(net, key);

        for (const cfg of configList) {
          if (!cfg.xpub) continue;
          await ensureAddresses(
            cfg.id,
            cfg.store_id,
            cfg.xpub,
            (i) => deriveEvmAddress(cfg.xpub!, net, i),
            0,
            (cfg.next_address_index ?? 0) + ADDRESS_WINDOW,
          );
        }

        const { data: cursor } = await supabaseAdmin
          .from("watcher_cursors")
          .select("last_height")
          .eq("chain", chain)
          .single();
        const fromBlock = Math.max(0, Number(cursor?.last_height ?? 0) - 5); // small replay margin

        const { data: addrs } = await supabaseAdmin
          .from("derived_addresses")
          .select("address")
          .in(
            "chain_config_id",
            configList.map((c) => c.id),
          );
        r.addresses = addrs?.length ?? 0;

        const transfers = await getTransfersTo(
          net,
          key,
          (addrs ?? []).map((a) => a.address),
          fromBlock,
        );
        r.credits = transfers.length;

        for (const t of transfers) {
          const { data: inv } = await supabaseAdmin
            .from("invoices")
            .select("id, fiat_amount, status")
            .eq("address", t.to.toLowerCase())
            .eq("chain", chain)
            .maybeSingle();
          if (!inv) continue;
          const rawAmount = BigInt(t.rawValue);
          const human = Number(rawAmount) / 10 ** t.decimals;
          const usd = t.isNative ? human * (await getUsdRate(chain)) : human; // stables ~ $1
          const confirmations = tip - t.blockNum + 1;
          const isConfirmed = confirmations >= net.confirmationsRequired;
          await recordTransaction(
            inv.id,
            t.txHash,
            human,
            confirmations,
            t.blockNum,
            isConfirmed,
          );
          const settled = await settleInvoice(inv.id, usd, Number(inv.fiat_amount));
          if (settled.changed) r.invoicesUpdated++;
        }

        await supabaseAdmin
          .from("watcher_cursors")
          .update({
            last_height: tip,
            last_run_at: new Date().toISOString(),
            last_status: "ok",
            last_error: null,
          })
          .eq("chain", chain);
      } else if (chain === "tron") {
        const net = TRON_NETWORK;
        const key = process.env.ALCHEMY_API_KEY;
        if (!key) throw new Error("ALCHEMY_API_KEY not configured");
        const tip = await getTronBlockNumber(net, key);

        // Tron: support both xpub (derive 0/i) and single static address (xpub_or_address).
        for (const cfg of configList) {
          if (cfg.xpub) {
            await ensureAddresses(
              cfg.id,
              cfg.store_id,
              cfg.xpub,
              (i) => deriveTronAddress(cfg.xpub!, i),
              0,
              (cfg.next_address_index ?? 0) + ADDRESS_WINDOW,
            );
          } else if (cfg.xpub_or_address) {
            // single-address mode
            const { supabaseAdmin: sb2 } = await import("@/integrations/supabase/client.server");
            await sb2
              .from("derived_addresses")
              .upsert(
                { chain_config_id: cfg.id, store_id: cfg.store_id, address: cfg.xpub_or_address, address_index: 0 },
                { onConflict: "address" },
              );
          }
        }

        const { data: addrs } = await supabaseAdmin
          .from("derived_addresses")
          .select("address")
          .in("chain_config_id", configList.map((c) => c.id));
        r.addresses = addrs?.length ?? 0;

        for (const a of addrs ?? []) {
          const credits = await getTronTransfersTo(net, key, a.address).catch(() => []);
          r.credits += credits.length;
          for (const t of credits) {
            const { data: inv } = await supabaseAdmin
              .from("invoices")
              .select("id, fiat_amount, status")
              .eq("address", a.address)
              .eq("chain", "tron")
              .maybeSingle();
            if (!inv) continue;
            const human = Number(BigInt(t.rawValue)) / 10 ** t.decimals;
            const usd = t.isNative ? human * (await getUsdRate("TRX")) : human;
            await recordTransaction(inv.id, t.txHash, human, net.confirmationsRequired, null, true);
            const settled = await settleInvoice(inv.id, usd, Number(inv.fiat_amount));
            if (settled.changed) r.invoicesUpdated++;
          }
        }

        await supabaseAdmin
          .from("watcher_cursors")
          .update({ last_height: tip, last_run_at: new Date().toISOString(), last_status: "ok", last_error: null })
          .eq("chain", "tron");
      } else if (chain === "sol") {
        // Solana: single-address mode only (no xpub derivation for ed25519 keys).
        // Invoices are matched by memo containing the invoice id prefix (first 8 chars).
        const net = SOL_NETWORK;
        const key = process.env.ALCHEMY_API_KEY;
        if (!key) throw new Error("ALCHEMY_API_KEY not configured");
        const tip = await getSolanaSlot(net, key);

        for (const cfg of configList) {
          if (!cfg.xpub_or_address) continue;
          const { supabaseAdmin: sb2 } = await import("@/integrations/supabase/client.server");
          await sb2
            .from("derived_addresses")
            .upsert(
              { chain_config_id: cfg.id, store_id: cfg.store_id, address: cfg.xpub_or_address, address_index: 0 },
              { onConflict: "address" },
            );
        }

        const { data: addrs } = await supabaseAdmin
          .from("derived_addresses")
          .select("address, store_id")
          .in("chain_config_id", configList.map((c) => c.id));
        r.addresses = addrs?.length ?? 0;

        for (const a of addrs ?? []) {
          const credits = await getSolanaCreditsTo(net, key, a.address).catch(() => []);
          r.credits += credits.length;
          for (const c of credits) {
            // Match by memo (invoice id prefix) within this store, or fall back to single open invoice on the address.
            let inv: { id: string; fiat_amount: number; status: string } | null = null;
            if (c.memo) {
              const prefix = c.memo.trim().slice(0, 8);
              const { data } = await supabaseAdmin
                .from("invoices")
                .select("id, fiat_amount, status")
                .eq("store_id", a.store_id)
                .eq("chain", "sol")
                .ilike("id", `${prefix}%`)
                .maybeSingle();
              inv = data as typeof inv;
            }
            if (!inv) {
              const { data } = await supabaseAdmin
                .from("invoices")
                .select("id, fiat_amount, status")
                .eq("address", a.address)
                .eq("chain", "sol")
                .in("status", ["pending", "underpaid"])
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              inv = data as typeof inv;
            }
            if (!inv) continue;
            const human = Number(BigInt(c.rawValue)) / 10 ** c.decimals;
            const usd = c.isNative ? human * (await getUsdRate("SOL")) : human;
            const isConfirmed = c.confirmations >= net.confirmationsRequired;
            await recordTransaction(inv.id, c.signature, human, c.confirmations, c.slot, isConfirmed);
            const settled = await settleInvoice(inv.id, usd, Number(inv.fiat_amount));
            if (settled.changed) r.invoicesUpdated++;
          }
        }

        await supabaseAdmin
          .from("watcher_cursors")
          .update({ last_height: tip, last_run_at: new Date().toISOString(), last_status: "ok", last_error: null })
          .eq("chain", "sol");
      }
    } catch (e) {
      r.error = (e as Error).message;
      await supabaseAdmin
        .from("watcher_cursors")
        .update({
          last_run_at: new Date().toISOString(),
          last_status: "error",
          last_error: r.error,
        })
        .eq("chain", chain);
    }
    results.push(r);
  }

  return results;
}
