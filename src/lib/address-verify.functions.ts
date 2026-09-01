// Admin crypto address / transaction verifier.
//
// Answers: "who owns this address?" and "does this tx belong to anyone here?"
// Matches against derived addresses, invoice addresses, static chain configs,
// and — when nothing is recorded — brute-derives merchant xpubs to find the
// owning store + derivation index (covers stale/rotated addresses).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ query: z.string().min(6).max(200) });

/** How far past the store's current index we scan when hunting an address. */
const SCAN_LOOKAHEAD = 60;
const SCAN_MAX = 400;

export interface VerifyMatch {
  kind: "derived_address" | "invoice_address" | "static_config" | "xpub_scan" | "transaction";
  chain: string | null;
  store_id: string | null;
  store_name: string | null;
  owner_email: string | null;
  address?: string | null;
  derivation_index?: number | null;
  derivation_path?: string | null;
  invoice_id?: string | null;
  invoice_status?: string | null;
  invoice_amount?: string | null;
  invoice_created_at?: string | null;
  tx_hash?: string | null;
  detail?: string | null;
}

export interface VerifyResult {
  query: string;
  queryType: "address" | "txhash" | "xpub" | "unknown";
  matches: VerifyMatch[];
  onchain: {
    chain: string;
    tipHeight: number;
    credits: { txid: string; amount: string; confirmations: number; explorer: string }[];
  } | null;
  explorers: { label: string; url: string }[];
  notes: string[];
}

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const verifyCryptoLookup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<VerifyResult> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      ALL_NETWORKS,
      getNetwork,
      isBtcLikeChain,
    } = await import("./chains/networks");
    const {
      deriveBtcLikeAddress,
      deriveEvmAddress,
      deriveTronAddress,
      isXpubLike,
    } = await import("./chains/derive.server");

    const q = data.query.trim();
    const lower = q.toLowerCase();
    const matches: VerifyMatch[] = [];
    const notes: string[] = [];
    const explorers: { label: string; url: string }[] = [];

    const isTxHash = /^0x[0-9a-fA-F]{64}$/.test(q) || /^[0-9a-fA-F]{64}$/.test(q);
    const queryType: VerifyResult["queryType"] = isXpubLike(q)
      ? "xpub"
      : isTxHash
        ? "txhash"
        : q.length >= 20
          ? "address"
          : "unknown";

    // ---- store lookup helper ----
    const storeCache = new Map<string, { name: string; email: string | null }>();
    async function storeInfo(storeId: string) {
      if (storeCache.has(storeId)) return storeCache.get(storeId)!;
      const { data: s } = await supabaseAdmin
        .from("stores")
        .select("name, owner_id")
        .eq("id", storeId)
        .maybeSingle();
      let email: string | null = null;
      if (s?.owner_id) {
        const { data: p } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("user_id", s.owner_id)
          .maybeSingle();
        email = p?.email ?? null;
      }
      const info = { name: s?.name ?? "(unknown store)", email };
      storeCache.set(storeId, info);
      return info;
    }

    // ---------------- transaction hash ----------------
    if (queryType === "txhash") {
      const { data: txs } = await supabaseAdmin
        .from("transactions")
        .select("tx_hash, amount, token_symbol, confirmations, invoice_id, first_seen_at, confirmed_at")
        .ilike("tx_hash", q)
        .limit(20);
      for (const t of txs ?? []) {
        const { data: inv } = await supabaseAdmin
          .from("invoices")
          .select("id, store_id, status, fiat_amount, fiat_currency, chain, address, created_at")
          .eq("id", t.invoice_id)
          .maybeSingle();
        const info = inv?.store_id ? await storeInfo(inv.store_id) : null;
        matches.push({
          kind: "transaction",
          chain: inv?.chain ?? null,
          store_id: inv?.store_id ?? null,
          store_name: info?.name ?? null,
          owner_email: info?.email ?? null,
          address: inv?.address ?? null,
          invoice_id: inv?.id ?? null,
          invoice_status: inv?.status ?? null,
          invoice_amount: inv ? `${inv.fiat_amount} ${inv.fiat_currency}` : null,
          invoice_created_at: inv?.created_at ?? null,
          tx_hash: t.tx_hash,
          detail: `${t.amount} ${t.token_symbol ?? ""} · ${t.confirmations} conf · seen ${t.first_seen_at}`,
        });
      }
      if ((txs ?? []).length === 0) {
        notes.push(
          "No recorded transaction with that hash. It may have been sent to an address we never derived, or on a chain we don't watch for that store.",
        );
      }
      for (const [key, net] of Object.entries(ALL_NETWORKS)) {
        const n = net as { name: string; explorerTx: (t: string) => string };
        if (matches.length && matches[0].chain && matches[0].chain !== key) continue;
        explorers.push({ label: n.name, url: n.explorerTx(q.replace(/^0x/, (m) => m)) });
      }
      return { query: q, queryType, matches, onchain: null, explorers: explorers.slice(0, 6), notes };
    }

    // ---------------- xpub ----------------
    if (queryType === "xpub") {
      const { data: cfgs } = await supabaseAdmin
        .from("chain_configs")
        .select("store_id, chain, xpub, xpub_or_address, next_address_index, enabled")
        .or(`xpub.eq.${q},xpub_or_address.eq.${q}`)
        .limit(20);
      for (const c of cfgs ?? []) {
        const info = await storeInfo(c.store_id);
        matches.push({
          kind: "static_config",
          chain: c.chain,
          store_id: c.store_id,
          store_name: info.name,
          owner_email: info.email,
          address: q,
          detail: `xpub on ${c.chain} · next index ${c.next_address_index} · ${c.enabled ? "enabled" : "disabled"}`,
        });
      }
      if (!matches.length) notes.push("That extended key is not configured on any store.");
      return { query: q, queryType, matches, onchain: null, explorers: [], notes };
    }

    // ---------------- address ----------------
    // 1. derived_addresses
    const { data: derived } = await supabaseAdmin
      .from("derived_addresses")
      .select("address, address_index, store_id, chain_config_id, created_at")
      .ilike("address", q)
      .limit(20);
    const configCache = new Map<string, { chain: string; store_id: string }>();
    for (const d of derived ?? []) {
      let cfg = configCache.get(d.chain_config_id);
      if (!cfg) {
        const { data: c } = await supabaseAdmin
          .from("chain_configs")
          .select("chain, store_id")
          .eq("id", d.chain_config_id)
          .maybeSingle();
        cfg = { chain: c?.chain ?? "?", store_id: c?.store_id ?? d.store_id };
        configCache.set(d.chain_config_id, cfg);
      }
      const info = await storeInfo(d.store_id);
      matches.push({
        kind: "derived_address",
        chain: cfg.chain,
        store_id: d.store_id,
        store_name: info.name,
        owner_email: info.email,
        address: d.address,
        derivation_index: d.address_index,
        derivation_path: `m/0/${d.address_index}`,
        detail: `derived ${d.created_at}`,
      });
    }

    // 2. invoices that used this address
    const { data: invs } = await supabaseAdmin
      .from("invoices")
      .select("id, store_id, status, chain, token_symbol, fiat_amount, fiat_currency, address, address_index, created_at, expires_at")
      .ilike("address", q)
      .order("created_at", { ascending: false })
      .limit(25);
    for (const inv of invs ?? []) {
      const info = await storeInfo(inv.store_id);
      matches.push({
        kind: "invoice_address",
        chain: inv.chain,
        store_id: inv.store_id,
        store_name: info.name,
        owner_email: info.email,
        address: inv.address,
        derivation_index: inv.address_index,
        invoice_id: inv.id,
        invoice_status: inv.status,
        invoice_amount: `${inv.fiat_amount} ${inv.fiat_currency}${inv.token_symbol ? ` (${inv.token_symbol})` : ""}`,
        invoice_created_at: inv.created_at,
        detail: `expired/expires ${inv.expires_at}`,
      });
    }

    // 3. static chain configs (sol / tron / address-only)
    const { data: staticCfgs } = await supabaseAdmin
      .from("chain_configs")
      .select("store_id, chain, xpub_or_address, enabled")
      .ilike("xpub_or_address", q)
      .limit(20);
    for (const c of staticCfgs ?? []) {
      const info = await storeInfo(c.store_id);
      matches.push({
        kind: "static_config",
        chain: c.chain,
        store_id: c.store_id,
        store_name: info.name,
        owner_email: info.email,
        address: c.xpub_or_address,
        detail: `static receive address · ${c.enabled ? "enabled" : "disabled"}`,
      });
    }

    // 4. brute-force xpub scan (finds stale / never-recorded addresses)
    if (matches.length === 0) {
      const { data: cfgs } = await supabaseAdmin
        .from("chain_configs")
        .select("store_id, chain, xpub, xpub_or_address, next_address_index");
      let scanned = 0;
      for (const c of cfgs ?? []) {
        const xpub = c.xpub || (isXpubLike(c.xpub_or_address ?? "") ? c.xpub_or_address : null);
        if (!xpub) continue;
        const chain = c.chain as string;
        const limit = Math.min(SCAN_MAX, (c.next_address_index ?? 0) + SCAN_LOOKAHEAD);
        let net: unknown = null;
        try {
          net = getNetwork(chain as never);
        } catch {
          continue;
        }
        for (let i = 0; i <= limit; i++) {
          let addr: string | null = null;
          try {
            if (isBtcLikeChain(chain)) {
              addr = deriveBtcLikeAddress(xpub, net as never, i);
            } else if (chain === "tron") {
              addr = deriveTronAddress(xpub, i);
            } else if ((net as { kind?: string }).kind === "evm") {
              addr = deriveEvmAddress(xpub, net as never, i);
            }
          } catch {
            break;
          }
          scanned++;
          if (!addr) continue;
          const hit =
            addr === q ||
            addr.toLowerCase() === lower ||
            addr.split(":").pop()?.toLowerCase() === lower.split(":").pop();
          if (hit) {
            const info = await storeInfo(c.store_id);
            matches.push({
              kind: "xpub_scan",
              chain,
              store_id: c.store_id,
              store_name: info.name,
              owner_email: info.email,
              address: addr,
              derivation_index: i,
              derivation_path: `m/0/${i}`,
              detail:
                i < (c.next_address_index ?? 0)
                  ? "previously issued address (no invoice record found)"
                  : "not yet issued — future address on this store's key",
            });
            break;
          }
        }
      }
      notes.push(`Scanned ${scanned} derived addresses across all merchant keys.`);
    }

    // ---------------- live on-chain lookup ----------------
    let onchain: VerifyResult["onchain"] = null;
    const chainGuess = matches.find((m) => m.chain)?.chain ?? null;
    if (chainGuess && isBtcLikeChain(chainGuess)) {
      try {
        const net = getNetwork(chainGuess as never) as {
          name: string;
          decimals: number;
          explorerTx: (t: string) => string;
          explorerAddr: (a: string) => string;
        };
        const { getAddressTxs, getTipHeight, extractIncoming } = await import(
          "./chains/btc-like.server"
        );
        const tip = await getTipHeight(net as never);
        const txs = await getAddressTxs(net as never, q);
        const credits = extractIncoming(txs, q, tip).map((c) => ({
          txid: c.txid,
          amount: (c.amountSats / 10 ** (net.decimals ?? 8)).toString(),
          confirmations: c.confirmations,
          explorer: net.explorerTx(c.txid),
        }));
        onchain = { chain: chainGuess, tipHeight: tip, credits: credits.slice(0, 25) };
        explorers.push({ label: `${net.name} explorer`, url: net.explorerAddr(q) });
      } catch (e) {
        notes.push(`Live chain lookup failed: ${(e as Error).message}`);
      }
    } else if (chainGuess) {
      try {
        const net = getNetwork(chainGuess as never) as {
          name: string;
          explorerAddr: (a: string) => string;
        };
        explorers.push({ label: `${net.name} explorer`, url: net.explorerAddr(q) });
      } catch { /* ignore */ }
    }

    if (matches.length === 0) {
      notes.push(
        "No merchant on NectarPay owns this address. If a customer paid it, the funds went somewhere outside our system.",
      );
    }

    return { query: q, queryType, matches, onchain, explorers, notes };
  });
