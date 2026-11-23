// Which coin a wallet balance treats as a network's native money. Browser-safe
// so the price-source test can check every network without loading server code.

/** Native coin of an EVM network: Ethereum and Base both use ETH. */
export function evmNativeSymbol(chain: string): string {
  if (chain === "bsc") return "BNB";
  if (chain === "zcu") return "ZCU";
  return "ETH";
}

/** Coin the balance page prices as this network's native balance. */
export function nativeCoinOf(chain: string): string {
  if (chain === "tron") return "TRX";
  if (chain === "base") return "ETH";
  const evmCoin = evmNativeSymbol(chain);
  // Only BNB Chain and Zero Chill differ from the Ethereum default; every
  // other network (Bitcoin, TEXITcoin, Litecoin, Solana, ...) names its own coin.
  return evmCoin === "ETH" ? chain.toUpperCase() : evmCoin;
}
