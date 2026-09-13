// Merchant reports aggregation.
//
// One pass over the invoices in range produces every report in the suite, so
// the browser never downloads raw invoice lists. All reads go through the
// caller's Supabase client, so RLS + store-team access decide what is visible.

import type { ReportBundle, ReportFilters, SeriesPoint, Totals } from "./reports.types";

const PAID = new Set(["confirmed", "overpaid"]);
const UNPAID = new Set(["pending", "detected", "underpaid"]);
const STABLES = new Set(["USDC", "USDT", "DAI", "PYUSD", "TSD"]);

const CHAIN_LABEL: Record<string, string> = {
  btc: "Bitcoin",
  lightning: "Lightning",
  txc: "TEXITcoin",
  isk: "Iskander",
  zcu: "ZeroChill",
  eth: "Ethereum",
  base: "Base",
  bsc: "BNB Chain",
  tron: "Tron",
  sol: "Solana",
  ltc: "Litecoin",
  doge: "Dogecoin",
  bch: "Bitcoin Cash",
  dash: "Dash",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function tickerForChain(chain?: string | null): string {
  if (!chain) return "—";
  const c = chain.toLowerCase();
  if (c === "base" || c === "eth") return "ETH";
  if (c === "bsc") return "BNB";
  if (c === "tron") return "TRX";
  if (c === "lightning") return "BTC";
  return chain.toUpperCase();
}

function emptyTotals(): Totals {
  return {
    volume: 0,
    count: 0,
    average: 0,
    unpaidValue: 0,
    unpaidCount: 0,
    expiredValue: 0,
    expiredCount: 0,
  };
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

type AnyClient = {
  from: (table: string) => any;
};

type InvoiceRow = {
  id: string;
  store_id: string;
  chain: string | null;
  token_symbol: string | null;
  fiat_amount: number | string;
  fiat_currency: string;
  crypto_amount: number | string | null;
  status: string;
  created_at: string;
  updated_at: string;
  customer_email: string | null;
  buyer_email: string | null;
  email_sent_at: string | null;
  first_viewed_at: string | null;
  stores: { id: string; name: string; tax_bps: number | null; tax_mode: string | null } | null;
  transactions: Array<{ amount: number | string; token_symbol: string | null; confirmed_at: string | null }> | null;
};

async function fetchInvoices(
  supabase: AnyClient,
  filters: { storeId?: string | null; chain?: string | null; from: string; to: string },
): Promise<InvoiceRow[]> {
  let q = supabase
    .from("invoices")
    .select(
      "id, store_id, chain, token_symbol, fiat_amount, fiat_currency, crypto_amount, status, created_at, updated_at, customer_email, buyer_email, email_sent_at, first_viewed_at, stores!inner(id, name, tax_bps, tax_mode), transactions(amount, token_symbol, confirmed_at)",
    )
    .gte("created_at", filters.from)
    .lte("created_at", filters.to)
    .order("created_at", { ascending: true })
    .limit(20000);

  if (filters.storeId) q = q.eq("store_id", filters.storeId);
  if (filters.chain) q = q.eq("chain", filters.chain);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    ...r,
    stores: Array.isArray(r.stores) ? r.stores[0] : r.stores,
  })) as InvoiceRow[];
}

function totalsFor(rows: InvoiceRow[]): Totals {
  const t = emptyTotals();
  for (const r of rows) {
    const amt = Number(r.fiat_amount ?? 0);
    if (PAID.has(r.status)) {
      t.volume += amt;
      t.count += 1;
    } else if (UNPAID.has(r.status)) {
      t.unpaidValue += amt;
      t.unpaidCount += 1;
    } else if (r.status === "expired" || r.status === "cancelled" || r.status === "failed") {
      t.expiredValue += amt;
      t.expiredCount += 1;
    }
  }
  t.volume = round(t.volume);
  t.unpaidValue = round(t.unpaidValue);
  t.expiredValue = round(t.expiredValue);
  t.average = t.count ? round(t.volume / t.count) : 0;
  return t;
}

export async function computeReports(
  supabase: AnyClient,
  filters: ReportFilters,
): Promise<ReportBundle> {
  const from = filters.from;
  const to = filters.to;
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const days = Math.max(1, Math.round((toMs - fromMs) / 86_400_000));
  const grain: "day" | "month" = days > 120 ? "month" : "day";

  const rows = await fetchInvoices(supabase, { ...filters, from, to });

  let previous: Totals | null = null;
  if (filters.compare) {
    const span = toMs - fromMs;
    const prevRows = await fetchInvoices(supabase, {
      storeId: filters.storeId,
      chain: filters.chain,
      from: new Date(fromMs - span).toISOString(),
      to: new Date(fromMs - 1).toISOString(),
    });
    previous = totalsFor(prevRows);
  }

  const totals = totalsFor(rows);
  const paid = rows.filter((r) => PAID.has(r.status));
  const currency = rows[0]?.fiat_currency ?? "USD";

  // ---- time series -------------------------------------------------------
  const seriesMap = new Map<string, SeriesPoint>();
  const weekday = WEEKDAYS.map((label) => ({ label, volume: 0, count: 0 }));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, volume: 0, count: 0 }));

  for (const r of paid) {
    const d = new Date(r.created_at);
    const bucket = grain === "month" ? r.created_at.slice(0, 7) : r.created_at.slice(0, 10);
    const amt = Number(r.fiat_amount ?? 0);
    const cur = seriesMap.get(bucket) ?? { bucket, volume: 0, count: 0 };
    cur.volume += amt;
    cur.count += 1;
    seriesMap.set(bucket, cur);

    const wd = weekday[d.getDay()]!;
    wd.volume += amt;
    wd.count += 1;
    const hr = hours[d.getHours()]!;
    hr.volume += amt;
    hr.count += 1;
  }
  const series = [...seriesMap.values()]
    .map((p) => ({ ...p, volume: round(p.volume) }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));

  const bestDay = series.reduce<SeriesPoint | null>(
    (acc, p) => (!acc || p.volume > acc.volume ? p : acc),
    null,
  );
  const bestHour = hours.reduce((acc, h) => (h.count > (hours[acc]?.count ?? 0) ? h.hour : acc), 0);

  // ---- chain / token -----------------------------------------------------
  const chainMap = new Map<string, { volume: number; count: number }>();
  const tokenMap = new Map<string, { volume: number; count: number }>();
  let stableVol = 0;
  let volatileVol = 0;

  for (const r of paid) {
    const amt = Number(r.fiat_amount ?? 0);
    const key = r.chain ?? "unknown";
    const c = chainMap.get(key) ?? { volume: 0, count: 0 };
    c.volume += amt;
    c.count += 1;
    chainMap.set(key, c);

    const token =
      r.token_symbol || r.transactions?.[0]?.token_symbol || tickerForChain(r.chain);
    const t = tokenMap.get(token) ?? { volume: 0, count: 0 };
    t.volume += amt;
    t.count += 1;
    tokenMap.set(token, t);

    if (STABLES.has(token.toUpperCase())) stableVol += amt;
    else volatileVol += amt;
  }

  const byChain = [...chainMap.entries()]
    .map(([key, v]) => ({
      key,
      label: CHAIN_LABEL[key] ?? key.toUpperCase(),
      volume: round(v.volume),
      count: v.count,
      average: v.count ? round(v.volume / v.count) : 0,
    }))
    .sort((a, b) => b.volume - a.volume);

  const byToken = [...tokenMap.entries()]
    .map(([token, v]) => ({
      token,
      volume: round(v.volume),
      count: v.count,
      average: v.count ? round(v.volume / v.count) : 0,
      stable: STABLES.has(token.toUpperCase()),
    }))
    .sort((a, b) => b.volume - a.volume);

  // ---- stores ------------------------------------------------------------
  const storeMap = new Map<string, { name: string; volume: number; count: number }>();
  for (const r of paid) {
    const id = r.store_id;
    const s = storeMap.get(id) ?? { name: r.stores?.name ?? "Store", volume: 0, count: 0 };
    s.volume += Number(r.fiat_amount ?? 0);
    s.count += 1;
    storeMap.set(id, s);
  }
  const byStore = [...storeMap.entries()]
    .map(([id, v]) => ({
      id,
      name: v.name,
      volume: round(v.volume),
      count: v.count,
      average: v.count ? round(v.volume / v.count) : 0,
    }))
    .sort((a, b) => b.volume - a.volume);

  // ---- devices & share links --------------------------------------------
  let termQuery = supabase
    .from("terminals")
    .select("id, label, store_id, last_seen_at, last_seen_city, last_seen_country, revoked_at, stores!inner(name)")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (filters.storeId) termQuery = termQuery.eq("store_id", filters.storeId);
  const { data: termRows } = await termQuery;

  const terminals = ((termRows ?? []) as any[]).map((t) => ({
    id: t.id as string,
    label: (t.label as string) ?? "Terminal",
    store: (Array.isArray(t.stores) ? t.stores[0]?.name : t.stores?.name) ?? "",
    lastSeen: (t.last_seen_at as string | null) ?? null,
    city: (t.last_seen_city as string | null) ?? null,
    country: (t.last_seen_country as string | null) ?? null,
    revoked: !!t.revoked_at,
  }));

  let linkQuery = supabase
    .from("public_terminals")
    .select("id, slug, title, store_id, view_count, active, stores!inner(name)")
    .order("view_count", { ascending: false })
    .limit(200);
  if (filters.storeId) linkQuery = linkQuery.eq("store_id", filters.storeId);
  const { data: linkRows } = await linkQuery;

  const shareLinks = ((linkRows ?? []) as any[]).map((l) => ({
    id: l.id as string,
    slug: l.slug as string,
    title: (l.title as string | null) ?? null,
    store: (Array.isArray(l.stores) ? l.stores[0]?.name : l.stores?.name) ?? "",
    views: Number(l.view_count ?? 0),
    active: !!l.active,
  }));

  // ---- invoicing / customers --------------------------------------------
  let emailed = 0;
  let opened = 0;
  let paidAfterEmail = 0;
  let expired = 0;
  let payMinutes = 0;
  let payMinutesCount = 0;
  const payers = new Map<string, { count: number; volume: number; last: string }>();

  for (const r of rows) {
    if (r.email_sent_at) {
      emailed += 1;
      if (r.first_viewed_at) opened += 1;
      if (PAID.has(r.status)) paidAfterEmail += 1;
    }
    if (r.status === "expired") expired += 1;
    if (PAID.has(r.status)) {
      const mins = (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 60000;
      if (isFinite(mins) && mins >= 0 && mins < 60 * 24 * 30) {
        payMinutes += mins;
        payMinutesCount += 1;
      }
      const email = (r.customer_email || r.buyer_email || "").trim().toLowerCase();
      if (email) {
        const p = payers.get(email) ?? { count: 0, volume: 0, last: r.created_at };
        p.count += 1;
        p.volume += Number(r.fiat_amount ?? 0);
        if (r.created_at > p.last) p.last = r.created_at;
        payers.set(email, p);
      }
    }
  }

  const repeatPayers = [...payers.entries()]
    .filter(([, v]) => v.count > 1)
    .map(([email, v]) => ({ email, count: v.count, volume: round(v.volume), last: v.last }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 50);

  // ---- settlement --------------------------------------------------------
  const settleMap = new Map<string, { token: string; chain: string; cryptoAmount: number; usd: number; count: number }>();
  for (const r of paid) {
    const token = r.token_symbol || r.transactions?.[0]?.token_symbol || tickerForChain(r.chain);
    const chain = r.chain ?? "unknown";
    const key = `${chain}:${token}`;
    const s = settleMap.get(key) ?? { token, chain: CHAIN_LABEL[chain] ?? chain.toUpperCase(), cryptoAmount: 0, usd: 0, count: 0 };
    const onchain = (r.transactions ?? []).reduce((acc, t) => acc + Number(t.amount ?? 0), 0);
    s.cryptoAmount += onchain || Number(r.crypto_amount ?? 0);
    s.usd += Number(r.fiat_amount ?? 0);
    s.count += 1;
    settleMap.set(key, s);
  }
  const settlement = [...settleMap.values()]
    .map((s) => ({ ...s, cryptoAmount: round(s.cryptoAmount, 8), usd: round(s.usd) }))
    .sort((a, b) => b.usd - a.usd);

  // Card processing benchmark: 2.9% + $0.30 per sale.
  const cardFeeUsd = round(totals.volume * 0.029 + totals.count * 0.3);

  // ---- tax / accounting --------------------------------------------------
  const taxMap = new Map<string, { month: string; currency: string; gross: number; tax: number; count: number }>();
  for (const r of paid) {
    const month = r.created_at.slice(0, 7);
    const cur = r.fiat_currency || "USD";
    const key = `${month}:${cur}`;
    const bps = Number(r.stores?.tax_bps ?? 0);
    const gross = Number(r.fiat_amount ?? 0);
    // Tax-inclusive pricing: back the tax out of the gross.
    const tax = bps > 0 ? gross - gross / (1 + bps / 10000) : 0;
    const t = taxMap.get(key) ?? { month, currency: cur, gross: 0, tax: 0, count: 0 };
    t.gross += gross;
    t.tax += tax;
    t.count += 1;
    taxMap.set(key, t);
  }
  const tax = [...taxMap.values()]
    .map((t) => ({
      month: t.month,
      currency: t.currency,
      gross: round(t.gross),
      taxEstimate: round(t.tax),
      net: round(t.gross - t.tax),
      count: t.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    generated_at: new Date().toISOString(),
    currency,
    range: { from, to, days, grain },
    totals,
    previous,
    series,
    byWeekday: weekday.map((w) => ({ ...w, volume: round(w.volume) })),
    byHour: hours.map((h) => ({ ...h, volume: round(h.volume) })),
    best: { day: bestDay, hour: paid.length ? bestHour : null },
    byChain,
    byToken,
    stableSplit: { stable: round(stableVol), volatile: round(volatileVol) },
    byStore,
    terminals,
    shareLinks,
    invoicing: {
      emailed,
      opened,
      paidAfterEmail,
      expired,
      avgMinutesToPay: payMinutesCount ? round(payMinutes / payMinutesCount, 1) : null,
    },
    repeatPayers,
    settlement,
    savings: { periodUsd: round(cardFeeUsd), cardFeeUsd, nectarFeeUsd: 0 },
    tax,
  };
}
