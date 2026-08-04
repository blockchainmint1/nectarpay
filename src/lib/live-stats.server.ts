// Server-only aggregation for public live stats.
// Consumed by src/lib/live-stats.functions.ts (app) and
// src/routes/api/public/v1/live-stats.ts (external site: nectar-pay.com/live).

import type { LiveStats } from "./live-stats.types";

const FEE_RATE = 0.029;

export async function computeLiveStats(): Promise<LiveStats> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const h24 = new Date(now.getTime() - 24 * 3600000).toISOString();

  const [
    storesAll,
    storesNew,
    terminalsAll,
    terminalsOnline,
    terminalsCountries,
    invoicesConfirmed,
    invoicesRecent,
    ledger,
    membersTotal,
    membersStates,
    terminalsByCountry,
  ] = await Promise.all([
    supabaseAdmin.from("stores").select("id, owner_id, created_at"),
    supabaseAdmin.from("stores").select("id").gte("created_at", d30),
    supabaseAdmin.from("terminals").select("id, store_id, last_seen_at, last_seen_country").is("revoked_at", null),
    supabaseAdmin.from("terminals").select("id").is("revoked_at", null).gte("last_seen_at", h24),
    supabaseAdmin.from("terminals").select("last_seen_country").not("last_seen_country", "is", null),
    supabaseAdmin
      .from("invoices")
      .select("id, store_id, chain, token_symbol, crypto_amount, fiat_amount, fiat_currency, created_at")
      .eq("status", "confirmed"),
    supabaseAdmin
      .from("invoices")
      .select("id, store_id, chain, token_symbol, crypto_amount, fiat_amount, fiat_currency, created_at, transactions(tx_hash, first_seen_at)")
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(10),
    supabaseAdmin
      .from("txc_credit_ledger")
      .select("user_id, amount_txc, usd_value, kind")
      .gt("amount_txc", 0),
    supabaseAdmin.from("members_geo").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("members_geo").select("state"),
    supabaseAdmin
      .from("terminals")
      .select("store_id, last_seen_country")
      .not("last_seen_country", "is", null)
      .is("revoked_at", null),
  ]);

  // Merchant activity: which stores have a confirmed invoice in last 30d
  const activeStoreIds = new Set(
    (invoicesConfirmed.data ?? [])
      .filter((i) => new Date(i.created_at).getTime() >= now.getTime() - 30 * 86400000)
      .map((i) => i.store_id),
  );

  const invoices = invoicesConfirmed.data ?? [];
  const volumeAll = invoices.reduce((s, i) => s + Number(i.fiat_amount ?? 0), 0);
  const volume30 = invoices
    .filter((i) => new Date(i.created_at).getTime() >= now.getTime() - 30 * 86400000)
    .reduce((s, i) => s + Number(i.fiat_amount ?? 0), 0);

  // Settlement breakdowns
  const byCurrencyMap = new Map<string, { count: number; volume: number }>();
  const byChainMap = new Map<string, { count: number; volume: number }>();
  const byTokenMap = new Map<string, number>();
  for (const i of invoices) {
    const c = byCurrencyMap.get(i.fiat_currency) ?? { count: 0, volume: 0 };
    c.count += 1;
    c.volume += Number(i.fiat_amount ?? 0);
    byCurrencyMap.set(i.fiat_currency, c);

    const chain = i.chain ?? "unknown";
    const ch = byChainMap.get(chain) ?? { count: 0, volume: 0 };
    ch.count += 1;
    ch.volume += Number(i.fiat_amount ?? 0);
    byChainMap.set(chain, ch);

    const tok = i.token_symbol ?? (i.chain ? i.chain.toUpperCase() : "—");
    byTokenMap.set(tok, (byTokenMap.get(tok) ?? 0) + 1);
  }

  // Country attribution via terminal → store
  const storeCountry = new Map<string, string>();
  for (const t of terminalsByCountry.data ?? []) {
    if (t.last_seen_country && !storeCountry.has(t.store_id)) {
      storeCountry.set(t.store_id, t.last_seen_country);
    }
  }
  const byCountryMap = new Map<string, { count: number; volume: number }>();
  for (const i of invoices) {
    const co = storeCountry.get(i.store_id) ?? "—";
    const row = byCountryMap.get(co) ?? { count: 0, volume: 0 };
    row.count += 1;
    row.volume += Number(i.fiat_amount ?? 0);
    byCountryMap.set(co, row);
  }

  // Rewards
  const rewardsRows = ledger.data ?? [];
  const totalTxc = rewardsRows.reduce((s, r) => s + Number(r.amount_txc ?? 0), 0);
  const totalUsd = rewardsRows.reduce((s, r) => s + Number(r.usd_value ?? 0), 0);
  const recipients = new Set(rewardsRows.map((r) => r.user_id)).size;

  // States rollup
  const stateMap = new Map<string, number>();
  for (const m of membersStates.data ?? []) {
    if (m.state) stateMap.set(m.state, (stateMap.get(m.state) ?? 0) + 1);
  }
  const topStates = [...stateMap.entries()]
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Recent transactions — enrich with country from store + on-chain tx hash
  const recent = (invoicesRecent.data ?? []).map((i) => {
    const txs = (i as unknown as { transactions?: Array<{ tx_hash: string; first_seen_at: string }> }).transactions ?? [];
    const firstTx = txs[0] ?? null;
    return {
      id: i.id,
      created_at: i.created_at,
      chain: i.chain,
      token: i.token_symbol,
      crypto_amount: i.crypto_amount === null ? null : Number(i.crypto_amount),
      fiat_amount: Number(i.fiat_amount ?? 0),
      fiat_currency: i.fiat_currency,
      country: storeCountry.get(i.store_id) ?? null,
      city: null,
      tx_hash: firstTx?.tx_hash ?? null,
    };
  });

  // Countries count from terminals
  const countrySet = new Set(
    (terminalsCountries.data ?? []).map((t) => t.last_seen_country).filter(Boolean),
  );

  const totalMerchants = (storesAll.data ?? []).length;
  const savingsAll = volumeAll * FEE_RATE;
  const savings30 = volume30 * FEE_RATE;

  return {
    generated_at: now.toISOString(),
    merchants: {
      total: totalMerchants,
      new_30d: (storesNew.data ?? []).length,
      active_30d: activeStoreIds.size,
    },
    terminals: {
      total: (terminalsAll.data ?? []).length,
      online_24h: (terminalsOnline.data ?? []).length,
      countries: countrySet.size,
    },
    handhelds: { total: (terminalsAll.data ?? []).length },
    rewards: { total_txc: totalTxc, total_usd: totalUsd, recipients },
    transactions: {
      total: invoices.length,
      last_30d: invoices.filter(
        (i) => new Date(i.created_at).getTime() >= now.getTime() - 30 * 86400000,
      ).length,
      volume_usd_all_time: volumeAll,
      volume_usd_30d: volume30,
      recent,
    },
    settlement: {
      by_currency: [...byCurrencyMap.entries()]
        .map(([currency, v]) => ({ currency, count: v.count, volume: v.volume }))
        .sort((a, b) => b.volume - a.volume),
      by_chain: [...byChainMap.entries()]
        .map(([chain, v]) => ({ chain, count: v.count, volume_usd: v.volume }))
        .sort((a, b) => b.volume_usd - a.volume_usd),
      by_token: [...byTokenMap.entries()]
        .map(([token, count]) => ({ token, count }))
        .sort((a, b) => b.count - a.count),
    },
    by_country: [...byCountryMap.entries()]
      .map(([country, v]) => ({ country, count: v.count, volume_usd: v.volume }))
      .sort((a, b) => b.volume_usd - a.volume_usd),
    savings: {
      total_usd: savingsAll,
      last_30d_usd: savings30,
      per_merchant_avg_usd: totalMerchants > 0 ? savingsAll / totalMerchants : 0,
    },
    network: {
      members_geo_total: membersTotal.count ?? 0,
      top_states: topStates,
    },
  };
}
