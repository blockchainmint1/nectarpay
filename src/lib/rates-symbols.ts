// Price sources for every coin the wallet balance pages can put a dollar
// value on. Browser-safe (no server imports) so tests and the UI can both read
// it. A coin missing from here silently counts as $0 in a merchant's total.

/** CoinMarketCap numeric ids for coins priced by the live rates poller. */
export const CMC_ID_MAP: Record<string, number> = {
  BTC: 1,
  ETH: 1027,
  TXC: 32744, // confirmed: https://coinmarketcap.com/currencies/texitcoin/ UCID 32744
  TRX: 1958,
  SOL: 5426,
  LTC: 2,
  BCH: 1831,
  DOGE: 74,
  DASH: 131,
  BNB: 1839,
};

/** Dollar-pegged tokens: worth $1 by definition, no feed needed. */
export const STABLE_SYMBOLS = ["USDC", "USDT", "DAI", "PYUSD", "TSD"];

/** Coins priced by a dedicated source instead of CoinMarketCap. */
export const DEDICATED_FEED_SYMBOLS = ["ZCU"]; // wzcu.zerochill.com Uniswap TWAP
