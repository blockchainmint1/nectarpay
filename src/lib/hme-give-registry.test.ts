import { describe, it, expect } from "vitest";
import { parseSignedRegistry, effectiveActive } from "./hme-give-registry";

const A = "Tst3dVnJbFrnx5ChmK6qj9F3M8YNsHWR44";
const body = (issued: string, recipients: unknown[] = [{ address: A, name: "CCV" }]) => ({ signed_payload: JSON.stringify({ issued_at: issued, recipients }), signature: "sig" });
const ok = () => true;
const now = new Date("2026-10-31T12:00:00Z");

describe("HME Give signed church list", () => {
  it("rejects a list not signed by the HME Give signer", () => {
    expect(parseSignedRegistry(body("2026-10-31T11:00:00Z"), { signer: "X", verify: () => false, now }).ok).toBe(false);
  });
  it("accepts a signed list", () => {
    const r = parseSignedRegistry(body("2026-10-31T11:00:00Z"), { signer: "X", verify: ok, now });
    expect(r.ok && r.list.recipients[0].address).toBe(A);
  });
  it("refuses an older list than the one already applied (no rollback)", () => {
    expect(parseSignedRegistry(body("2026-10-30T11:00:00Z"), { signer: "X", verify: ok, now, lastIssuedAt: "2026-10-31T00:00:00Z" }).ok).toBe(false);
  });
  it("refuses bad addresses", () => {
    expect(parseSignedRegistry(body("2026-10-31T11:00:00Z", [{ address: "0xabc", name: "x" }]), { signer: "X", verify: ok, now }).ok).toBe(false);
  });
  it("our admin block wins over HME Give's active flag", () => {
    expect(effectiveActive(true, true)).toBe(false);
    expect(effectiveActive(true, false)).toBe(true);
  });
});
