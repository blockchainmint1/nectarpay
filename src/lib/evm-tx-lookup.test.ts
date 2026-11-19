import { describe, expect, it } from "vitest";
import { parseEvmTransfers } from "./evm-tx-lookup.server";
import { BSC_NETWORK, ETH_NETWORK } from "./chains/networks";

const T = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const to = "0x3a319e0fcbc9e8621d021b7243bd520951d7c1d4";
const pad = (a: string) => "0x" + "0".repeat(24) + a.slice(2);

describe("parseEvmTransfers", () => {
  it("reads an 18-decimal BNB Chain USDT transfer as 400.44 USDT", () => {
    const out = parseEvmTransfers(BSC_NETWORK, { to: "0x55d398326f99059ff775485246999027b3197955", value: "0x0" }, [
      {
        address: "0x55d398326f99059ff775485246999027b3197955",
        topics: [T, pad("0x9c711db45e0e92ad58f676cb24886b5514b791cf"), pad(to)],
        data: "0x000000000000000000000000000000000000000000000015b538aa60c16c0000",
      },
    ]);
    expect(out).toEqual([{ to, amount: "400.44", symbol: "USDT" }]);
  });

  it("ignores token contracts we don't recognise", () => {
    const out = parseEvmTransfers(ETH_NETWORK, { to: null, value: "0x0" }, [
      { address: "0x000000000000000000000000000000000000dead", topics: [T, pad(to), pad(to)], data: "0x01" },
    ]);
    expect(out).toEqual([]);
  });
});
