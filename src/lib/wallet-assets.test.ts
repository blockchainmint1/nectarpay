import { describe, expect, it } from "vitest";

import { summarizeWalletScan, type ScanAddress } from "./wallet-assets";

const addr = (over: Partial<ScanAddress>): ScanAddress => ({
  index: 1,
  address: "a",
  nativeSymbol: "ETH",
  native: 0,
  nativePending: 0,
  tokens: [],
  usd: 0,
  explorerUrl: "",
  ...over,
});

describe("wallet scan totals", () => {
  it("adds $400 USDC on Ethereum and $2,000 USDC on Base into one $2,400 USDC line", () => {
    const s = summarizeWalletScan([
      { chain: "eth", rates: { ETH: 3000, USDC: 1 }, addresses: [addr({ tokens: [{ symbol: "USDC", amount: 400 }], usd: 400 })] },
      { chain: "base", rates: { ETH: 3000, USDC: 1 }, addresses: [addr({ tokens: [{ symbol: "USDC", amount: 2000 }], usd: 2000 })] },
    ]);
    expect(s.usd).toBe(2400);
    expect(s.assets).toEqual([{ symbol: "USDC", amount: 2400, usd: 2400, priced: true }]);
    expect(s.chains["base"]?.usd).toBe(2000);
    expect(s.chains["eth"]?.usd).toBe(400);
  });

  it("counts coins still confirming in the holding", () => {
    const s = summarizeWalletScan([
      { chain: "btc", rates: { BTC: 100000 }, addresses: [addr({ nativeSymbol: "BTC", native: 0.01, nativePending: 0.002, usd: 1200 })] },
    ]);
    expect(s.assets[0]?.amount).toBeCloseTo(0.012, 10);
    expect(s.assets[0]?.usd).toBe(1200);
  });

  it("separates addresses holding money from empty and unreadable ones", () => {
    const s = summarizeWalletScan([
      {
        chain: "txc",
        rates: { TXC: 0.08, TSD: 1 },
        addresses: [
          addr({ index: 1, nativeSymbol: "TXC", tokens: [{ symbol: "TSD", amount: 400 }], usd: 400 }),
          addr({ index: 2, nativeSymbol: "TXC" }),
          addr({ index: 3, nativeSymbol: "TXC", error: "timeout" }),
        ],
      },
    ]);
    expect(s.checked).toBe(3);
    expect(s.funded).toBe(1);
    expect(s.failed).toBe(1);
  });

  it("keeps a coin with no live price in the amounts but adds $0", () => {
    const s = summarizeWalletScan([
      { chain: "bsc", rates: { BNB: 0, USDT: 1 }, addresses: [addr({ nativeSymbol: "BNB", native: 0.5, tokens: [{ symbol: "USDT", amount: 400.44 }], usd: 400.44 })] },
    ]);
    const bnb = s.assets.find((a) => a.symbol === "BNB");
    expect(bnb).toEqual({ symbol: "BNB", amount: 0.5, usd: 0, priced: false });
    expect(s.usd).toBe(400.44);
  });
});
