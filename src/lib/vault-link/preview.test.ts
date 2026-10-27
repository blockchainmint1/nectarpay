import { describe, expect, it } from "vitest";
import { HDKey } from "@scure/bip32";
import { deriveBtcLikeAddress, deriveEvmAddress } from "@/lib/chains/derive.server";
import { TXC_NETWORK, ETH_NETWORK } from "@/lib/chains/networks";
import { vaultPreviewAddresses } from "./preview.server";

const root = HDKey.fromMasterSeed(new Uint8Array(32).fill(7));
const txc = root.derive("m/44'/696969'/0'").publicExtendedKey;
const eth = root.derive("m/44'/60'/0'").publicExtendedKey;

describe("Vault comparison-only previews", () => {
  it("shows TXC index 0 for comparison and keeps the first-sale address at index 1", () => {
    const result = vaultPreviewAddresses({ txc })[0];
    expect(result.comparisonAddress).toBe(deriveBtcLikeAddress(txc, TXC_NETWORK, 0));
    expect(result.address).toBe(deriveBtcLikeAddress(txc, TXC_NETWORK, 1));
    expect(result.comparisonAddress).not.toBe(result.address);
  });
  it("shows EVM index 0 for comparison and keeps the first-sale address at index 1", () => {
    const result = vaultPreviewAddresses({ eth })[0];
    expect(result.comparisonAddress).toBe(deriveEvmAddress(eth, ETH_NETWORK, 0));
    expect(result.address).toBe(deriveEvmAddress(eth, ETH_NETWORK, 1));
    expect(result.comparisonAddress).not.toBe(result.address);
  });
});