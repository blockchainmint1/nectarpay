import { describe, expect, test } from "bun:test";
import { identifyEvmAsset } from "./evm-asset";
import { ETH_NETWORK, BASE_NETWORK, BSC_NETWORK } from "./networks";

describe("trusted EVM asset identity", () => {
  for (const net of [ETH_NETWORK, BASE_NETWORK, BSC_NETWORK]) {
    test(`${net.symbol}: fake USDC and USDT contracts are rejected`, () => {
      expect(identifyEvmAsset(net, "token", "0x0000000000000000000000000000000000000001")).toBeNull();
      expect(identifyEvmAsset(net, "token", null)).toBeNull();
    });
    for (const symbol of ["USDC", "USDT"]) {
      test(`${net.symbol}: genuine ${symbol} uses configured decimals`, () => {
        const stable = net.stables.find((s) => s.symbol === symbol);
        if (!stable) throw new Error(`Missing ${symbol}`);
        expect(identifyEvmAsset(net, "token", stable.address.toUpperCase())).toEqual({
          symbol, decimals: net.symbol === "bsc" ? 18 : 6, isNative: false,
        });
      });
    }
  }
  test("a token cannot masquerade as a native transfer", () => {
    expect(identifyEvmAsset(BASE_NETWORK, "external", BASE_NETWORK.stables[0].address)).toBeNull();
    expect(identifyEvmAsset(ETH_NETWORK, "external", null)).toEqual({ symbol: "ETH", decimals: 18, isNative: true });
  });
  test("another network's USDC contract is not accepted", () => {
    expect(identifyEvmAsset(BASE_NETWORK, "token", ETH_NETWORK.stables[0].address)).toBeNull();
  });
});