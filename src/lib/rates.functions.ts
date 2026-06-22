// Live rates poller: CoinMarketCap for BTC/ETH/TXC. Falls back to
// mempool.texitcoin.org/api/v1/prices for TXC if CMC fails. Stablecoins are
// pegged at $1 in the conversion layer (not stored in rates_cache).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CMC_ID_MAP: Record<string, number> = {
  BTC: 1,
  ETH: 1027,
  TXC: 32744, // confirmed: https://coinmarketcap.com/currencies/texitcoin/ UCID 32744
  TRX: 1958,
  SOL: 5426,
};

export async function pollRates(): Promise<{
  updated: { symbol: string; rate: number; source: string }[];
  errors: string[];
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cmcKey = process.env.COINMARKETCAP_API_KEY;
  const updated: { symbol: string; rate: number; source: string }[] = [];
  const errors: string[] = [];

  const symbols = Object.keys(CMC_ID_MAP);

  if (cmcKey) {
    try {
      const ids = symbols.map((s) => CMC_ID_MAP[s]).join(",");
      const res = await fetch(
        `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=${ids}&convert=USD`,
        { headers: { "X-CMC_PRO_API_KEY": cmcKey, Accept: "application/json" } },
      );
      if (!res.ok) throw new Error(`CMC ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as {
        data: Record<string, { symbol: string; quote: { USD: { price: number } } }>;
      };
      for (const sym of symbols) {
        const row = json.data?.[String(CMC_ID_MAP[sym])];
        const price = row?.quote?.USD?.price;
        if (typeof price === "number" && price > 0) {
          const chainSym = sym === "TRX" ? "tron" : sym.toLowerCase();
          const chain = chainSym as "btc" | "eth" | "txc" | "tron" | "sol";
          const { error } = await supabaseAdmin
            .from("rates_cache")
            .upsert(
              { chain, fiat: "USD", rate: price, fetched_at: new Date().toISOString() },
              { onConflict: "chain,fiat" },
            );
          if (error) errors.push(`upsert ${sym}: ${error.message}`);
          else updated.push({ symbol: sym, rate: price, source: "cmc" });
        }
      }
    } catch (e) {
      errors.push(`cmc: ${(e as Error).message}`);
    }
  } else {
    errors.push("COINMARKETCAP_API_KEY not configured");
  }

  // TXC fallback via mempool.texitcoin.org
  if (!updated.find((u) => u.symbol === "TXC")) {
    try {
      const res = await fetch("https://mempool.texitcoin.org/api/v1/prices");
      if (res.ok) {
        const data = (await res.json()) as { USD?: number };
        if (typeof data.USD === "number" && data.USD > 0) {
          await supabaseAdmin
            .from("rates_cache")
            .upsert(
              { chain: "txc", fiat: "USD", rate: data.USD, fetched_at: new Date().toISOString() },
              { onConflict: "chain,fiat" },
            );
          updated.push({ symbol: "TXC", rate: data.USD, source: "mempool.texitcoin.org" });
        }
      }
    } catch (e) {
      errors.push(`txc fallback: ${(e as Error).message}`);
    }
  }

  return { updated, errors };
}

/** Look up a USD rate for a chain symbol. Stablecoins return 1. */
export async function getUsdRate(symbol: string): Promise<number> {
  const up = symbol.toUpperCase();
  if (up === "USDC" || up === "USDT" || up === "DAI" || up === "PYUSD") return 1;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // TRX is stored under chain="tron"; everything else lowercases.
  const chain = (up === "TRX" ? "tron" : up.toLowerCase()) as
    | "btc" | "eth" | "txc" | "base" | "doge" | "isk" | "zcu" | "tron" | "sol";
  const { data } = await supabaseAdmin
    .from("rates_cache")
    .select("rate")
    .eq("chain", chain)
    .eq("fiat", "USD")
    .maybeSingle();
  return Number(data?.rate ?? 0);
}

export const getRatesSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("rates_cache")
      .select("chain, fiat, rate, fetched_at")
      .order("chain");
    return (data ?? []).map((r) => ({
      symbol: String(r.chain).toUpperCase(),
      fiat: r.fiat,
      rate: Number(r.rate),
      fetched_at: r.fetched_at,
    }));
  });
