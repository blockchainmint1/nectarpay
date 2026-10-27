import { describe, expect, it } from "vitest";
import { HDKey } from "@scure/bip32";
import { parseVaultPairing } from "./pairing";
import { PartCollector, toParts } from "./qr-parts";

const root = HDKey.fromMasterSeed(new Uint8Array(32).fill(7));
const x = (p: string) => root.derive(p).publicExtendedKey;
const payload = JSON.stringify({
  hmvault: 1,
  fp: "73c5da0a",
  txc: { "44": x("m/44'/696969'/0'"), "84": x("m/84'/696969'/0'") },
  btc: { "44": x("m/44'/0'/0'"), "84": x("m/84'/0'/0'") },
  doge: { "44": x("m/44'/3'/0'") },
  evm: { address: "0x" + "a".repeat(40), path: "m/44'/60'/0'/0/0" },
});

describe("HME Vault pairing", () => {
  it("uses TXC legacy (44) and BTC native segwit (84) keys", () => {
    const p = parseVaultPairing(payload);
    expect(p.keys.txc).toBe(x("m/44'/696969'/0'"));
    expect(p.keys.btc).toBe(x("m/84'/0'/0'"));
    expect(p.keys.doge).toBe(x("m/44'/3'/0'"));
  });

  it("does not link EVM from a single address (no rotation possible)", () => {
    const p = parseVaultPairing(payload);
    expect(p.keys.eth).toBeUndefined();
    expect(p.evmAddressOnly).toBe(true);
  });

  it("rejects non-Vault QR codes", () => {
    expect(() => parseVaultPairing('{"foo":1}')).toThrow();
  });

  it("reassembles an animated QR in any frame order", () => {
    const parts = toParts(payload);
    expect(parts.length).toBeGreaterThan(1);
    const c = new PartCollector();
    let out: string | null = null;
    for (const part of [...parts].reverse()) out = c.add(part);
    expect(out).toBe(payload);
  });
});
