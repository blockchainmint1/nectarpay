import { describe, expect, it } from "vitest";
import { BSC_MAX_CATCHUP, bscScanRange, parseBscStableLogs } from "./bsc-mistake-watch.server";

const TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const SEEDS = "0x3a319E0fCbc9E8621D021B7243bd520951D7C1D4";
const pad = (a: string) => "0x" + "0".repeat(24) + a.toLowerCase().slice(2);
const log = (over: Partial<Record<string, unknown>> = {}) => ({
  address: "0x55d398326f99059ff775485246999027b3197955", // BNB Chain USDT
  topics: [TOPIC, pad("0x1111111111111111111111111111111111111111"), pad(SEEDS)],
  data: "0x" + (400440000000000000000n).toString(16), // 400.44 USDT (18 decimals)
  transactionHash: "0x55bf",
  blockNumber: "0x" + (134450651).toString(16),
  blockTimestamp: "0x" + Math.floor(Date.parse("2026-11-19T05:53:17Z") / 1000).toString(16),
  ...over,
});

describe("BNB Chain mistake watch", () => {
  it("reads a USDT payment to a store address (the SEEDS 400.44 payment)", () => {
    const [t] = parseBscStableLogs([log()], [SEEDS]);
    expect(t.asset).toBe("USDT");
    expect(Number(BigInt(t.rawValue)) / 10 ** t.decimals).toBe(400.44);
    expect(t.blockNum).toBe(134450651);
    expect(t.blockTimeMs).toBe(Date.parse("2026-11-19T05:53:17Z"));
  });

  it("ignores tokens we don't recognise, other recipients and reorged logs", () => {
    expect(parseBscStableLogs([log({ address: "0xdeadbeef00000000000000000000000000000000" })], [SEEDS])).toEqual([]);
    expect(parseBscStableLogs([log()], ["0x2222222222222222222222222222222222222222"])).toEqual([]);
    expect(parseBscStableLogs([log({ removed: true })], [SEEDS])).toEqual([]);
  });

  it("never catches up more than the cap after a long pause", () => {
    expect(bscScanRange(133803079, 134564766)).toEqual({ from: 134564766 - BSC_MAX_CATCHUP, to: 134564766 });
    expect(bscScanRange(134564700, 134564766)).toEqual({ from: 134564695, to: 134564766 });
  });
});
