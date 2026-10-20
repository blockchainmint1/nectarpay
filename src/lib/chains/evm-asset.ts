import type { EvmNetwork } from "./networks";

/** Token names and reported decimals are untrusted; only configured contracts count. */
export function identifyEvmAsset(
  net: EvmNetwork,
  category: string,
  contractAddress: string | null | undefined,
): { symbol: string; decimals: number; isNative: boolean } | null {
  if (category === "external" || category === "internal") {
    if (contractAddress) return null;
    return { symbol: net.symbol.toUpperCase(), decimals: 18, isNative: true };
  }
  if (category !== "token" && category !== "erc20") return null;
  const stable = net.stables.find(
    (s) => s.address.toLowerCase() === contractAddress?.toLowerCase(),
  );
  return stable ? { symbol: stable.symbol, decimals: stable.decimals, isNative: false } : null;
}