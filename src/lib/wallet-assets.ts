// Browser-safe wallet scan math: turns per-address balances into per-coin and
// per-network totals for the Wallet balances page and the store-page card.

export interface ScanToken {
  symbol: string;
  amount: number;
  network?: string;
}

export interface ScanAddress {
  index: number;
  address: string;
  nativeSymbol: string;
  native: number;
  nativePending: number;
  tokens: ScanToken[];
  usd: number;
  explorerUrl: string;
  error?: string;
}

export interface ScanPage {
  chain: string;
  addresses: ScanAddress[];
  /** USD price per coin used for this page; 0 means no live price. */
  rates: Record<string, number>;
}

export interface AssetTotal {
  symbol: string;
  amount: number;
  usd: number;
  /** False when we have no live price for this coin (its dollars show as 0). */
  priced: boolean;
}

export interface ChainScan {
  chain: string;
  usd: number;
  assets: AssetTotal[];
  addresses: ScanAddress[];
  /** Addresses holding anything. */
  funded: number;
  checked: number;
  /** Addresses the blockchain reader couldn't answer for. */
  failed: number;
}

export interface WalletScanSummary {
  usd: number;
  assets: AssetTotal[];
  chains: Record<string, ChainScan>;
  funded: number;
  checked: number;
  failed: number;
}

/** Each coin held at one address, with its dollar value. */
export function addressAssets(a: ScanAddress, rates: Record<string, number>): AssetTotal[] {
  const out: AssetTotal[] = [];
  const nativeAmount = a.native + a.nativePending;
  if (nativeAmount > 0) {
    const rate = rates[a.nativeSymbol.toUpperCase()] ?? 0;
    out.push({ symbol: a.nativeSymbol.toUpperCase(), amount: nativeAmount, usd: nativeAmount * rate, priced: rate > 0 });
  }
  for (const t of a.tokens) {
    if (t.amount <= 0) continue;
    const rate = rates[t.symbol.toUpperCase()] ?? 0;
    out.push({ symbol: t.symbol.toUpperCase(), amount: t.amount, usd: t.amount * rate, priced: rate > 0 });
  }
  return out;
}

function addInto(map: Map<string, AssetTotal>, a: AssetTotal) {
  const cur = map.get(a.symbol);
  if (cur) {
    cur.amount += a.amount;
    cur.usd += a.usd;
    cur.priced = cur.priced || a.priced;
  } else map.set(a.symbol, { ...a });
}

const byValue = (x: AssetTotal, y: AssetTotal) => y.usd - x.usd || y.amount - x.amount;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function summarizeWalletScan(pages: ScanPage[]): WalletScanSummary {
  const all = new Map<string, AssetTotal>();
  const perChain = new Map<string, { assets: Map<string, AssetTotal>; scan: ChainScan }>();

  for (const page of pages) {
    let entry = perChain.get(page.chain);
    if (!entry) {
      entry = {
        assets: new Map(),
        scan: { chain: page.chain, usd: 0, assets: [], addresses: [], funded: 0, checked: 0, failed: 0 },
      };
      perChain.set(page.chain, entry);
    }
    for (const a of page.addresses) {
      entry.scan.addresses.push(a);
      entry.scan.checked++;
      if (a.error) entry.scan.failed++;
      const held = addressAssets(a, page.rates);
      if (held.length) entry.scan.funded++;
      for (const h of held) {
        addInto(entry.assets, h);
        addInto(all, h);
      }
      entry.scan.usd += a.usd;
    }
  }

  const chains: Record<string, ChainScan> = {};
  let usd = 0;
  let funded = 0;
  let checked = 0;
  let failed = 0;
  for (const [chain, { assets, scan }] of perChain) {
    scan.usd = round2(scan.usd);
    scan.assets = [...assets.values()].map((a) => ({ ...a, usd: round2(a.usd) })).sort(byValue);
    scan.addresses.sort((x, y) => x.index - y.index);
    chains[chain] = scan;
    usd += scan.usd;
    funded += scan.funded;
    checked += scan.checked;
    failed += scan.failed;
  }
  return {
    usd: round2(usd),
    assets: [...all.values()].map((a) => ({ ...a, usd: round2(a.usd) })).sort(byValue),
    chains,
    funded,
    checked,
    failed,
  };
}

const ASSET_NAMES: Record<string, string> = {
  TSD: "Texas Stable Dollar",
  TXC: "TEXITcoin",
  USDC: "USD Coin",
  USDT: "Tether",
  PYUSD: "PayPal USD",
  DAI: "Dai",
  ETH: "Ether",
  BTC: "Bitcoin",
  LTC: "Litecoin",
  DOGE: "Dogecoin",
  BNB: "BNB",
  ZCU: "Zero Chill Units",
  ISK: "ISK",
};

export function assetName(symbol: string): string {
  return ASSET_NAMES[symbol.toUpperCase()] ?? symbol.toUpperCase();
}

const ASSET_TOKENS = new Set(["tsd", "txc", "usdc", "usdt", "pyusd", "dai", "eth", "btc", "ltc", "doge", "bnb", "zcu"]);

/** Brand color token for a coin (see --asset-* in styles.css). */
export function assetColor(symbol: string): string {
  const s = symbol.toLowerCase();
  return ASSET_TOKENS.has(s) ? `var(--asset-${s})` : "var(--asset-other)";
}

const NETWORK_TOKENS: Record<string, string> = {
  btc: "btc",
  txc: "txc",
  eth: "eth",
  base: "base",
  bsc: "bnb",
  ltc: "ltc",
  doge: "doge",
  zcu: "zcu",
};

export function networkColor(chain: string): string {
  const t = NETWORK_TOKENS[chain];
  return t ? `var(--asset-${t})` : "var(--asset-other)";
}

export function formatUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Coin amounts: whole-ish for big holdings, more decimals for small ones. */
export function formatAmount(n: number): string {
  const max = n >= 1000 ? 2 : n >= 1 ? 4 : 8;
  return n.toLocaleString("en-US", { maximumFractionDigits: max });
}
