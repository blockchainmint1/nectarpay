import { describe, expect, it } from "vitest";

import { ALL_NETWORKS } from "./chains/networks";
import { nativeCoinOf } from "./chains/native-coin";
import { CMC_ID_MAP, DEDICATED_FEED_SYMBOLS, STABLE_SYMBOLS } from "./rates-symbols";

/** True when a coin has somewhere to get a live USD price from. */
function hasPriceSource(coin: string): boolean {
  return (
    STABLE_SYMBOLS.includes(coin) || coin in CMC_ID_MAP || DEDICATED_FEED_SYMBOLS.includes(coin)
  );
}

describe("wallet balance price sources", () => {
  const chains = Object.keys(ALL_NETWORKS).filter((c) => c !== "lightning");

  it("has a price for every network's native coin", () => {
    for (const chain of chains) {
      const coin = nativeCoinOf(chain);
      expect(hasPriceSource(coin), `${coin} (native on ${chain}) has no price source`).toBe(true);
    }
  });

  it("prices BNB, which used to count as $0 on the balances page", () => {
    expect(CMC_ID_MAP.BNB).toBe(1839);
  });

  it("prices the stablecoins a merchant can hold", () => {
    for (const stable of ["USDC", "USDT", "DAI", "PYUSD", "TSD"]) {
      expect(hasPriceSource(stable), `${stable} has no price source`).toBe(true);
    }
  });
});
