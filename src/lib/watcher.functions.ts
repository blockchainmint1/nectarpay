// Main watcher orchestrator. Called by the cron route every minute.
// For each chain_config with an xpub:
//   1) Ensure the next batch of derived addresses exists
//   2) Poll the chain for incoming credits to those addresses
//   3) Match credits to open invoices, mark paid/underpaid, emit notifications & webhooks

import { BTC_NETWORK, TXC_NETWORK, ETH_NETWORK, EVM_NETWORKS, TRON_NETWORK, SOL_NETWORK } from "./chains/networks";
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

/**
 * Effective confirmations required for this credit. If the merchant has
 * opted into mempool acceptance for small payments (`zero_conf_max_usd`)
 * and the paid USD amount is at or under that threshold, treat 0-conf
 * (mempool-visible) as good. Otherwise fall back to the merchant's
 * configured `confirmations_required`, then the network default.
 */
function effectiveConfsRequired(
  store: { default_confirmations_required?: number | null; mempool_max_usd?: number | null } | null | undefined,
  netDefault: number,
  paidUsd: number,
): number {
  const zc = store?.mempool_max_usd == null ? null : Number(store.mempool_max_usd);
  if (zc != null && zc > 0 && paidUsd <= zc) return 0;
  return store?.default_confirmations_required ?? netDefault;
}

async function markInvoiceDetected(invoiceId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: inv } = await supabaseAdmin
    .from("invoices")
    .select("status")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv || inv.status !== "pending") return false;
  const { error } = await supabaseAdmin
    .from("invoices")
    .update({ status: "detected" })
    .eq("id", invoiceId)
    .eq("status", "pending");
  return !error;
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
    .select("address_index, address")
    .eq("chain_config_id", chainConfigId);
  const have = new Map((existing ?? []).map((r) => [r.address_index, r.address]));
  const rows: { chain_config_id: string; store_id: string; address: string; address_index: number }[] =
    [];
  for (let i = startIndex; i <= endIndex; i++) {
    try {
      const address = derive(i);
      if ((have.get(i) ?? "").toLowerCase() === address.toLowerCase()) continue;
      rows.push({
        chain_config_id: chainConfigId,
        store_id: storeId,
        address,
        address_index: i,
      });
    } catch (e) {
      console.error(`derive ${i} failed`, e);
    }
  }
  if (rows.length) {
    const { error } = await supabaseAdmin
      .from("derived_addresses")
      .upsert(rows, { onConflict: "chain_config_id,address_index" });
    if (error) {
      console.error("[watcher] ensureAddresses upsert failed:", error);
    }
  }
}

export async function recordTransaction(
  invoiceId: string,
  txHash: string,
  amount: number,
  confirmations: number,
  blockHeight: number | null,
  isConfirmed: boolean,
  tokenSymbol: string | null = null,
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
      token_symbol: tokenSymbol,
    });
  }
}


/**
 * Sum every CONFIRMED transaction on this invoice into a USD total. This is
 * how underpayment top-ups settle: the second tx isn't evaluated alone — we
 * add it to whatever the address already received.
 *
 * - Native invoices (token_symbol IS NULL): all credits use the invoice's
 *   locked USD rate so a small market wiggle between quote and payment
 *   doesn't show as underpaid.
 * - Stable invoices: each credit is 1 USD per token.
 */
async function totalPaidUsdForInvoice(
  invoiceId: string,
  invoiceTokenSymbol: string | null,
  lockedRate: number | null,
): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: txs } = await supabaseAdmin
    .from("transactions")
    .select("amount, token_symbol, confirmed_at")
    .eq("invoice_id", invoiceId)
    .not("confirmed_at", "is", null);
  if (!txs?.length) return 0;
  const isStable = !!invoiceTokenSymbol;
  let total = 0;
  for (const t of txs) {
    const amt = Number(t.amount);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    total += isStable ? amt : amt * (lockedRate ?? 0);
  }
  return total;
}

export async function settleInvoice(
  invoiceId: string,
  _ignoredLatestCreditUsd: number,
  amountDueUsd: number,
): Promise<{ status: string; changed: boolean; paidUsd: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: inv } = await supabaseAdmin
    .from("invoices")
    .select("id, status, store_id, chain, address, fiat_amount, fiat_currency, external_order_id, token_symbol, rate, stores(owner_id, webhook_url, webhook_secret)")
    .eq("id", invoiceId)
    .single();
  if (!inv || ["confirmed", "expired", "cancelled"].includes(inv.status)) {
    return { status: inv?.status ?? "unknown", changed: false, paidUsd: 0 };
  }

  const lockedRate = inv.rate == null ? null : Number(inv.rate);
  const paidAmountUsd = await totalPaidUsdForInvoice(inv.id, inv.token_symbol ?? null, lockedRate);
  const isPaid = paidAmountUsd + 0.005 >= amountDueUsd;
  const newStatus: "confirmed" | "underpaid" | typeof inv.status = isPaid
    ? "confirmed"
    : paidAmountUsd > 0
      ? "underpaid"
      : inv.status;
  if (newStatus === inv.status) return { status: newStatus, changed: false, paidUsd: paidAmountUsd };


  await supabaseAdmin
    .from("invoices")
    .update({ status: newStatus })
    .eq("id", invoiceId);

  const store = inv.stores as { owner_id: string; webhook_url: string | null; webhook_secret: string | null } | null;
  const ownerId = store?.owner_id;
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

  // Outbound signed webhook to the merchant's server, if configured.
  if (store?.webhook_url && store.webhook_secret && (newStatus === "confirmed" || newStatus === "underpaid")) {
    const { deliverWebhook } = await import("./webhooks.server");
    const eventType = newStatus === "confirmed" ? "invoice.paid" : "invoice.underpaid";
    const eventId = (crypto as { randomUUID: () => string }).randomUUID();
    const result = await deliverWebhook({
      url: store.webhook_url,
      secret: store.webhook_secret,
      event: {
        id: eventId,
        type: eventType,
        created_at: new Date().toISOString(),
        data: {
          invoice_id: inv.id,
          store_id: inv.store_id,
          status: newStatus,
          chain: inv.chain as string,
          address: inv.address as string,
          fiat_amount: Number(inv.fiat_amount),
          fiat_currency: inv.fiat_currency,
          paid_amount_usd: paidAmountUsd,
          order_id: inv.external_order_id ?? null,
        },
      },
    });
    if (!result.ok) {
      console.error(`webhook delivery failed (invoice ${inv.id}):`, result.status, result.error);
    }
  }

  return { status: newStatus, changed: true, paidUsd: paidAmountUsd };
}

export async function scanBtcLikeInvoiceNow(invoiceId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: inv } = await supabaseAdmin
    .from("invoices")
    .select("id, store_id, chain, address, fiat_amount, status, rate, stores!inner(default_confirmations_required, mempool_max_usd)")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv || !inv.address || (inv.chain !== "btc" && inv.chain !== "txc")) return false;
  if (["confirmed", "overpaid", "expired", "cancelled", "failed"].includes(inv.status)) return false;

  const net = inv.chain === "btc" ? BTC_NETWORK : TXC_NETWORK;
  const [tip, txs] = await Promise.all([getTipHeight(net), getAddressTxs(net, inv.address)]);
  const credits = extractIncoming(txs, inv.address, tip);
  let changed = false;

  for (const credit of credits) {
    const paidCrypto = credit.amountSats / 10 ** net.decimals;
    const lockedRate = inv.rate == null ? null : Number(inv.rate);
    const usdRate = lockedRate && lockedRate > 0 ? lockedRate : await getUsdRate(inv.chain);
    const paidUsd = paidCrypto * usdRate;
    const required = effectiveConfsRequired(inv.stores ?? null, net.confirmationsRequired, paidUsd);
    const isConfirmed = credit.confirmations >= required;
    await recordTransaction(inv.id, credit.txid, paidCrypto, credit.confirmations, null, isConfirmed);
    if (isConfirmed) {
      const settled = await settleInvoice(inv.id, paidUsd, Number(inv.fiat_amount));
      changed = settled.changed || changed;
    } else {
      changed = (await markInvoiceDetected(inv.id)) || changed;
    }
  }

  return changed;
}

interface AlchemyTransferWithMetadata {
  blockNum: string;
  hash: string;
  to: string;
  value: number | null;
  asset: string | null;
  category: "external" | "internal" | "erc20";
  metadata?: { blockTimestamp?: string };
  rawContract: { value?: string; rawValue?: string; address: string | null; decimal?: string | null; decimals?: number | null };
}

async function alchemyAssetTransfersForAddress(
  net: typeof ETH_NETWORK,
  key: string,
  address: string,
  fromBlock: number,
): Promise<AlchemyTransferWithMetadata[]> {
  const res = await fetch(net.rpcUrl(key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [{
        fromBlock: `0x${Math.max(0, fromBlock).toString(16)}`,
        toAddress: address,
        category: ["external", "internal", "erc20"],
        withMetadata: true,
        excludeZeroValue: true,
        maxCount: "0x32",
        order: "desc",
      }],
    }),
  });
  if (!res.ok) throw new Error(`alchemy_getAssetTransfers → ${res.status}`);
  const json = await res.json() as { result?: { transfers?: AlchemyTransferWithMetadata[] }, error?: { message: string } };
  if (json.error) throw new Error(`alchemy_getAssetTransfers: ${json.error.message}`);
  return json.result?.transfers ?? [];
}

export async function scanEvmInvoiceNow(invoiceId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: inv } = await supabaseAdmin
    .from("invoices")
    .select("id, store_id, chain, address, fiat_amount, status, rate, token_symbol, created_at, expires_at, stores!inner(default_confirmations_required, mempool_max_usd)")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!inv || !inv.address || !["eth", "base", "bsc"].includes(inv.chain)) return false;
  if (["confirmed", "overpaid", "cancelled", "failed"].includes(inv.status)) return false;

  const key = process.env.ALCHEMY_API_KEY;
  if (!key) return false;

  const createdMs = Date.parse(inv.created_at);
  const expiresMs = inv.expires_at ? Date.parse(inv.expires_at) : createdMs + 15 * 60 * 1000;
  const startsAfterMs = createdMs - 5 * 60 * 1000;
  const endsBeforeMs = expiresMs + 60 * 60 * 1000;
  const token = (inv.token_symbol ?? "").toUpperCase();
  const scanNets = token
    ? EVM_NETWORKS
    : EVM_NETWORKS.filter((n) => n.symbol === inv.chain || (inv.chain === "eth" && n.symbol === "eth"));

  let changed = false;

  for (const net of scanNets) {
    const tip = await getBlockNumber(net, key);
    const fromBlock = Math.max(0, tip - 7200); // ~1 day on Ethereum; enough for missed webhooks/cron drift.
    const transfers = await alchemyAssetTransfersForAddress(net, key, inv.address, fromBlock).catch((e) => {
      console.error(`[watcher] hot EVM scan failed on ${net.symbol}:`, e);
      return [] as AlchemyTransferWithMetadata[];
    });

    for (const t of transfers) {
      const blockTime = Date.parse(t.metadata?.blockTimestamp ?? "");
      if (Number.isFinite(blockTime) && (blockTime < startsAfterMs || blockTime > endsBeforeMs)) continue;

      const contractAddr = t.rawContract.address?.toLowerCase() ?? null;
      const isNative = t.category === "external" || t.category === "internal";
      const stable = contractAddr
        ? net.stables.find((s) => s.address.toLowerCase() === contractAddr)
        : null;
      if (token) {
        if (!stable || stable.symbol.toUpperCase() !== token) continue;
      } else if (!isNative) {
        continue;
      }

      const raw = t.rawContract.value ?? t.rawContract.rawValue ?? "0";
      const decimals = stable?.decimals ?? (typeof t.rawContract.decimals === "number"
        ? t.rawContract.decimals
        : t.rawContract.decimal
          ? parseInt(t.rawContract.decimal, 16)
          : 18);
      const human = Number(BigInt(raw)) / 10 ** decimals;
      if (!Number.isFinite(human) || human <= 0) continue;

      const blockNum = parseInt(t.blockNum, 16);
      const confirmations = Math.max(0, tip - blockNum + 1);
      const lockedRate = inv.rate == null ? null : Number(inv.rate);
      const paidUsd = token ? human : human * (lockedRate && lockedRate > 0 ? lockedRate : await getUsdRate(net.symbol));
      const required = effectiveConfsRequired(inv.stores ?? null, net.confirmationsRequired, paidUsd);
      const isConfirmed = confirmations >= required;

      await recordTransaction(inv.id, t.hash, human, confirmations, blockNum, isConfirmed, token ? token : null);
      if (isConfirmed) {
        const settled = await settleInvoice(inv.id, paidUsd, Number(inv.fiat_amount));
        changed = settled.changed || changed;
      } else if (await markInvoiceDetected(inv.id)) {
        changed = true;
      }
    }
  }

  return changed;
}

/**
 * Mark stale unpaid invoices as `expired` so their reserved addresses are
 * released back into the recycler pool. Only touches invoices with zero
 * payment activity — `underpaid` invoices keep their lock because real
 * money landed on that address.
 */
async function expireStaleInvoices(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .update({ status: "expired" })
    .in("status", ["pending", "detected"])
    .lt("expires_at", nowIso)
    .select("id");
  if (error) {
    console.error("[watcher] expireStaleInvoices failed:", error);
    return 0;
  }
  return data?.length ?? 0;
}

export async function runWatcherTick(): Promise<WatcherResult[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const results: WatcherResult[] = [];

  // Release address locks from invoices whose expires_at has passed.
  await expireStaleInvoices();



  const { data: configs } = await supabaseAdmin
    .from("chain_configs")
    .select("*, stores!inner(id, owner_id, default_confirmations_required, mempool_max_usd)")
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

        const cfgByStoreId = new Map(configList.map((c) => [c.store_id, c]));
        const { data: openInvoices } = await supabaseAdmin
          .from("invoices")
          .select("id, store_id, address, fiat_amount, status, rate, crypto_amount")
          .eq("chain", chain)
          .in("store_id", configList.map((c) => c.store_id))
          .in("status", ["pending", "detected", "underpaid"])
          .not("address", "is", null);
        r.addresses = openInvoices?.length ?? 0;

        for (const inv of openInvoices ?? []) {
          if (!inv.address) continue;
          const txs = await getAddressTxs(net, inv.address).catch(() => []);
          const credits = extractIncoming(txs, inv.address, tip);
          r.credits += credits.length;
          const cfg = cfgByStoreId.get(inv.store_id);
          for (const credit of credits) {
            const paidCrypto = credit.amountSats / 10 ** net.decimals;
            // Settle against the rate locked at invoice creation. Otherwise a
            // tiny market move between quoting and payment makes an exact-
            // amount payment look "underpaid" forever.
            const lockedRate = inv.rate == null ? null : Number(inv.rate);
            const usdRate = lockedRate && lockedRate > 0 ? lockedRate : await getUsdRate(chain);
            const paidUsd = paidCrypto * usdRate;
            const required = effectiveConfsRequired(cfg?.stores ?? null, net.confirmationsRequired, paidUsd);
            const isConfirmed = credit.confirmations >= required;
            await recordTransaction(
              inv.id,
              credit.txid,
              paidCrypto,
              credit.confirmations,
              null,
              isConfirmed,
            );
            if (isConfirmed) {
              const settled = await settleInvoice(inv.id, paidUsd, Number(inv.fiat_amount));
              if (settled.changed) r.invoicesUpdated++;
            } else if (await markInvoiceDetected(inv.id)) {
              r.invoicesUpdated++;
            }
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
      } else if (chain === "eth") {
        // One EVM xpub covers Ethereum, Base, BSC, etc. — same derivation, same addresses.
        // Scan every EVM network we support against the same derived address set.
        const key = process.env.ALCHEMY_API_KEY;
        if (!key) throw new Error("ALCHEMY_API_KEY not configured");

        // Derive addresses once (EVM derivation is network-agnostic).
        for (const cfg of configList) {
          if (!cfg.xpub) continue;
          await ensureAddresses(
            cfg.id,
            cfg.store_id,
            cfg.xpub,
            (i) => deriveEvmAddress(cfg.xpub!, ETH_NETWORK, i),
            0,
            (cfg.next_address_index ?? 0) + ADDRESS_WINDOW,
          );
        }

        const { data: addrs } = await supabaseAdmin
          .from("derived_addresses")
          .select("address")
          .in("chain_config_id", configList.map((c) => c.id));
        r.addresses = addrs?.length ?? 0;
        const addrList = (addrs ?? []).map((a) => a.address);

        for (const net of EVM_NETWORKS) {
          try {
            const tip = await getBlockNumber(net, key);
            const { data: cursor } = await supabaseAdmin
              .from("watcher_cursors")
              .select("last_height")
              .eq("chain", net.symbol)
              .maybeSingle();
            const fromBlock = Math.max(0, Number(cursor?.last_height ?? 0) - 5);

            const transfers = await getTransfersTo(net, key, addrList, fromBlock);
            r.credits += transfers.length;

            for (const t of transfers) {
              // Match invoice on (address, chain, token_symbol).
              // Native transfer → invoice.token_symbol IS NULL; chain must be
              //   the specific EVM network (or "eth" as a generic catch-all).
              // Stable transfer → invoice.token_symbol must equal t.asset and
              //   chain may be any EVM key, because stables enabled on the
              //   shared EVM xpub list a single combined option ("USDC on
              //   Ethereum, Base or BSC") backed by one address — wherever
              //   the customer sends it, we settle the same invoice.
              const matchChains = (
                t.isNative ? [net.symbol, "eth"] : ["eth", "base", "bsc"]
              ) as never[];
              const invQuery = supabaseAdmin
                .from("invoices")
                .select("id, fiat_amount, status, chain, token_symbol")
                .ilike("address", t.to) // EVM addresses are stored checksum-cased; match case-insensitively
                .in("chain", matchChains);
              const { data: candidates } = await invQuery;
              const inv = (candidates ?? []).find((c) =>
                t.isNative ? c.token_symbol == null : (c.token_symbol ?? "").toUpperCase() === t.asset.toUpperCase(),
              );
              if (!inv) continue;

              const rawAmount = BigInt(t.rawValue);
              const human = Number(rawAmount) / 10 ** t.decimals;
              // Stables = $1; native uses live rate.
              const usd = t.isNative ? human * (await getUsdRate(net.symbol)) : human;
              const confirmations = tip - t.blockNum + 1;
              const cfg = configList[0];
              const required = effectiveConfsRequired(cfg?.stores ?? null, net.confirmationsRequired, usd);
              const isConfirmed = confirmations >= required;
              await recordTransaction(inv.id, t.txHash, human, confirmations, t.blockNum, isConfirmed, t.asset);
              if (isConfirmed) {
                const settled = await settleInvoice(inv.id, usd, Number(inv.fiat_amount));
                if (settled.changed) r.invoicesUpdated++;
              } else if (await markInvoiceDetected(inv.id)) {
                r.invoicesUpdated++;
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
              .eq("chain", net.symbol);
          } catch (e) {
            console.error(`EVM scan failed on ${net.symbol}`, e);
            await supabaseAdmin
              .from("watcher_cursors")
              .update({
                last_run_at: new Date().toISOString(),
                last_status: "error",
                last_error: (e as Error).message,
              })
              .eq("chain", net.symbol);
          }
        }
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
            const { data: candidates } = await supabaseAdmin
              .from("invoices")
              .select("id, fiat_amount, status, token_symbol, crypto_amount")
              .eq("address", a.address)
              .eq("chain", "tron")
              .in("status", ["pending", "detected", "underpaid"]);
            const human = Number(BigInt(t.rawValue)) / 10 ** t.decimals;
            // Match by token + amount-within-tolerance. The 5th-decimal nonce
            // applied at invoice creation makes the expected amount unique
            // across concurrent pending invoices on this shared address.
            const inv = (candidates ?? []).find((c) => {
              const tokOk = t.isNative
                ? c.token_symbol == null
                : (c.token_symbol ?? "").toUpperCase() === t.asset.toUpperCase();
              if (!tokOk) return false;
              if (c.crypto_amount == null) return false;
              return Math.abs(human - Number(c.crypto_amount)) <= 0.000005;
            });
            if (!inv) continue;
            const usd = t.isNative ? human * (await getUsdRate("TRX")) : human;
            await recordTransaction(inv.id, t.txHash, human, net.confirmationsRequired, null, true, t.asset);
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
            // Match priority: memo (invoice id prefix) within this store, then
            // address + token + amount-within-tolerance. The amount nonce
            // (5th decimal) is the fallback fingerprint when no memo is set.
            type InvMatch = {
              id: string;
              fiat_amount: number;
              status: string;
              token_symbol: string | null;
              crypto_amount: number | null;
            };
            const human = Number(BigInt(c.rawValue)) / 10 ** c.decimals;
            const matchToken = (row: InvMatch) =>
              c.isNative ? row.token_symbol == null : (row.token_symbol ?? "").toUpperCase() === c.asset.toUpperCase();
            const matchAmount = (row: InvMatch) =>
              row.crypto_amount != null && Math.abs(human - Number(row.crypto_amount)) <= 0.000005;
            let inv: InvMatch | null = null;
            if (c.memo) {
              const prefix = c.memo.trim().slice(0, 8);
              const { data } = await supabaseAdmin
                .from("invoices")
                .select("id, fiat_amount, status, token_symbol, crypto_amount")
                .eq("store_id", a.store_id)
                .eq("chain", "sol")
                .ilike("id", `${prefix}%`);
              inv = ((data ?? []) as InvMatch[]).find(matchToken) ?? null;
            }
            if (!inv) {
              const { data } = await supabaseAdmin
                .from("invoices")
                .select("id, fiat_amount, status, token_symbol, crypto_amount")
                .eq("address", a.address)
                .eq("chain", "sol")
                .in("status", ["pending", "detected", "underpaid"])
                .order("created_at", { ascending: false })
                .limit(50);
              inv = ((data ?? []) as InvMatch[]).find((row) => matchToken(row) && matchAmount(row)) ?? null;
            }
            if (!inv) continue;
            const usd = c.isNative ? human * (await getUsdRate("SOL")) : human;
            const isConfirmed = c.confirmations >= net.confirmationsRequired;
            await recordTransaction(inv.id, c.signature, human, c.confirmations, c.slot, isConfirmed, c.asset);
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
