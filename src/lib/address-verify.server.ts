// Core logic for the crypto address / transaction verifier.
//
// Answers: "who owns this address?" and "is this transaction one of mine?"
// Matches against derived addresses, invoice addresses, static chain configs,
// and — when nothing is recorded — brute-derives merchant xpubs to find the
// owning store + derivation index (covers stale / rotated addresses).
//
// `storeIds` scopes every lookup: admins pass null (all stores), merchants pass
// the ids of the stores they own.

/** How far past the store's current index we scan when hunting an address. */
const SCAN_LOOKAHEAD = 60;
const SCAN_MAX = 400;

/** Cold Storage Coins registry — public "verify a coin" endpoint (no auth). */
const CSC_REGISTRY_URL = "https://coldstoragecoins-admin.lovable.app/api/public/v5/coin-details";

interface CscCoin {
  assetId: string;
  publicKey: string;
  blockchainCode: string | null;
  blockchainName: string | null;
  cryptoCurrency: string | null;
  activationStatus: boolean;
  stickerImgUrl: string | null;
  displayValues: { fieldTitle: string; fieldValue: string; link?: string }[];
}

/** Look the query up in the Cold Storage Coins registry (by address or asset ID). */
async function lookupColdStorageCoin(identifier: string): Promise<CscCoin | null> {
  try {
    const res = await fetch(CSC_REGISTRY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicKey: identifier }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const body = (await res.json()) as { coin?: CscCoin; displayValues?: CscCoin["displayValues"] };
    if (!body?.coin) return null;
    return { ...body.coin, displayValues: body.displayValues ?? [] };
  } catch {
    return null;
  }
}

export interface VerifyMatch {
  kind:
    | "derived_address"
    | "invoice_address"
    | "static_config"
    | "xpub_scan"
    | "transaction"
    | "cold_storage_coin";
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

export async function runVerify(
  query: string,
  storeIds: string[] | null,
  opts: { includeOwnerEmail?: boolean } = {},
): Promise<VerifyResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { ALL_NETWORKS, getNetwork, isBtcLikeChain } = await import("./chains/networks");
  const { deriveBtcLikeAddress, deriveEvmAddress, deriveTronAddress, isXpubLike } = await import(
    "./chains/derive.server"
  );

  const q = query.trim();
  const lower = q.toLowerCase();
  const matches: VerifyMatch[] = [];
  const notes: string[] = [];
  const explorers: { label: string; url: string }[] = [];
  const scoped = storeIds !== null;

  if (scoped && storeIds.length === 0) {
    return {
      query: q,
      queryType: "unknown",
      matches: [],
      onchain: null,
      explorers: [],
      notes: ["You don't have any stores yet, so there's nothing to check against."],
    };
  }

  const isTxHash = /^0x[0-9a-fA-F]{64}$/.test(q) || /^[0-9a-fA-F]{64}$/.test(q);
  const queryType: VerifyResult["queryType"] = isXpubLike(q)
    ? "xpub"
    : isTxHash
      ? "txhash"
      : q.length >= 20
        ? "address"
        : "unknown";

  const storeCache = new Map<string, { name: string; email: string | null }>();
  async function storeInfo(storeId: string) {
    if (storeCache.has(storeId)) return storeCache.get(storeId)!;
    const { data: s } = await supabaseAdmin
      .from("stores")
      .select("name, owner_id")
      .eq("id", storeId)
      .maybeSingle();
    let email: string | null = null;
    if (opts.includeOwnerEmail && s?.owner_id) {
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

  const inScope = (storeId: string | null | undefined) =>
    !scoped || (!!storeId && storeIds.includes(storeId));

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
      if (!inScope(inv?.store_id)) continue;
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
        detail: `${t.amount} ${t.token_symbol ?? ""} · ${t.confirmations} conf · first seen ${t.first_seen_at}`,
      });
    }
    if (matches.length === 0) {
      notes.push(
        scoped
          ? "No transaction with that hash is recorded against your stores. It may have been sent to an address outside your current wallet setup."
          : "No recorded transaction with that hash. It may have gone to an address we never derived, or on a chain we don't watch for that store.",
      );
    }
    for (const [key, net] of Object.entries(ALL_NETWORKS)) {
      const n = net as { name: string; explorerTx: (t: string) => string };
      if (matches.length && matches[0].chain && matches[0].chain !== key) continue;
      explorers.push({ label: n.name, url: n.explorerTx(q) });
    }
    return { query: q, queryType, matches, onchain: null, explorers: explorers.slice(0, 6), notes };
  }

  // ---------------- xpub ----------------
  if (queryType === "xpub") {
    let cq = supabaseAdmin
      .from("chain_configs")
      .select("store_id, chain, xpub, xpub_or_address, next_address_index, enabled")
      .or(`xpub.eq.${q},xpub_or_address.eq.${q}`)
      .limit(20);
    if (scoped) cq = cq.in("store_id", storeIds);
    const { data: cfgs } = await cq;
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
    if (!matches.length) notes.push("That extended key is not configured on any store here.");
    return { query: q, queryType, matches, onchain: null, explorers: [], notes };
  }

  // ---------------- address ----------------
  // 1. derived addresses
  let dq = supabaseAdmin
    .from("derived_addresses")
    .select("address, address_index, store_id, chain_config_id, created_at")
    .ilike("address", q)
    .limit(20);
  if (scoped) dq = dq.in("store_id", storeIds);
  const { data: derived } = await dq;
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
      detail: `issued ${d.created_at}`,
    });
  }

  // 2. invoices that used this address
  let iq = supabaseAdmin
    .from("invoices")
    .select(
      "id, store_id, status, chain, token_symbol, fiat_amount, fiat_currency, address, address_index, created_at, expires_at",
    )
    .ilike("address", q)
    .order("created_at", { ascending: false })
    .limit(25);
  if (scoped) iq = iq.in("store_id", storeIds);
  const { data: invs } = await iq;
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
      detail: `invoice window ended ${inv.expires_at}`,
    });
  }

  // 3. static receive addresses (sol / tron / address-only configs)
  let sq = supabaseAdmin
    .from("chain_configs")
    .select("store_id, chain, xpub_or_address, enabled")
    .ilike("xpub_or_address", q)
    .limit(20);
  if (scoped) sq = sq.in("store_id", storeIds);
  const { data: staticCfgs } = await sq;
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

  // 4. brute-force key scan — finds stale / never-recorded addresses
  if (matches.length === 0) {
    let cq = supabaseAdmin
      .from("chain_configs")
      .select("store_id, chain, xpub, xpub_or_address, next_address_index");
    if (scoped) cq = cq.in("store_id", storeIds);
    const { data: cfgs } = await cq;
    let scanned = 0;
    for (const c of cfgs ?? []) {
      const xpub = c.xpub || (isXpubLike(c.xpub_or_address ?? "") ? c.xpub_or_address : null);
      if (!xpub) continue;
      const chain = c.chain as string;
      const limit = Math.min(SCAN_MAX, (c.next_address_index ?? 0) + SCAN_LOOKAHEAD);
      let net: unknown;
      try {
        net = getNetwork(chain as never);
      } catch {
        continue;
      }
      if (!net) continue;
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
                ? "previously issued address (no invoice record found) — a late or repeat payment"
                : "not yet issued — a future address on this wallet key",
          });
          break;
        }
      }
    }
    notes.push(`Scanned ${scanned} derived addresses across ${scoped ? "your" : "all merchant"} wallet keys.`);
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
    } catch {
      /* ignore */
    }
  }

  // ---------------- Cold Storage Coins registry ----------------
  // Matches physical minted coins by public address, or by 6-digit asset ID.
  const isAssetId = /^\d{4,8}$/.test(q);
  if (queryType === "address" || isAssetId) {
    const coin = await lookupColdStorageCoin(q);
    if (coin) {
      const dv = (t: string) =>
        coin.displayValues.find((d) => d.fieldTitle.toLowerCase() === t)?.fieldValue;
      const facts = [
        dv("product"),
        dv("denomination") ? `${dv("denomination")} ${coin.cryptoCurrency ?? ""}`.trim() : null,
        dv("metal"),
        dv("serial") ? `serial ${dv("serial")}` : null,
        dv("minted") ? `minted ${dv("minted")}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      matches.push({
        kind: "cold_storage_coin",
        chain: coin.blockchainCode,
        store_id: null,
        store_name: null,
        owner_email: null,
        address: coin.publicKey,
        detail: `Cold Storage Coin asset ${coin.assetId}${facts ? ` — ${facts}` : ""} · ${coin.activationStatus ? "activated" : "not activated"}`,
      });
      notes.push(
        "This address is printed on a physical Cold Storage Coin — it is that coin's receive address, not an invoice address.",
      );
    } else if (isAssetId) {
      notes.push("No Cold Storage Coin is registered under that asset ID.");
    }
  }

  if (matches.length === 0) {
    notes.push(
      scoped
        ? "This address does not belong to any of your stores. If a customer says they paid it, the funds went somewhere else — don't release goods on it."
        : "No merchant on NectarPay owns this address. If a customer paid it, the funds went somewhere outside our system.",
    );
  }

  return { query: q, queryType, matches, onchain, explorers, notes };
}
