import { describe, expect, it } from "vitest";
import { buildSignedList, filterCauses, signerKey, type Cause } from "./egiving-causes";
import { verifyTxcSignature } from "./wallet-signature.server";

const causes: Cause[] = [
  { code: "CCV", name: "Christ Church of the Valley", city: "Peoria, AZ", blurb: null, address: "Tst3dVnJbFrnx5ChmK6qj9F3M8YNsHWR44", featured: true },
  { code: "GRC", name: "Grace Chapel", city: "Austin, TX", blurb: null, address: "TxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", featured: false },
];

describe("eGiving cause list", () => {
  it("code lookup is case-insensitive", () => {
    expect(filterCauses(causes, { code: "ccv" }).map((c) => c.code)).toEqual(["CCV"]);
  });
  it("search matches city", () => {
    expect(filterCauses(causes, { q: "austin" }).map((c) => c.code)).toEqual(["GRC"]);
  });
  it("signature verifies against the published signer address", () => {
    const list = buildSignedList(causes, signerKey("test-secret"), "2026-10-30T00:00:00.000Z");
    expect(list.signer.startsWith("T")).toBe(true);
    expect(verifyTxcSignature({ address: list.signer, message: list.signed_payload, signature: list.signature })).toBe(true);
  });
  it("an altered address fails verification", () => {
    const list = buildSignedList(causes, signerKey("test-secret"));
    const tampered = list.signed_payload.replace("Tst3dVnJ", "Tattack1");
    expect(verifyTxcSignature({ address: list.signer, message: tampered, signature: list.signature })).toBe(false);
  });
});
