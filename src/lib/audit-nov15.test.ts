import { describe, expect, it } from "vitest";
import { codeRecipient } from "./key-change-code";
import { freeTierStartPatch } from "./free-tier";
import { isOpenAmountCollision, OPEN_AMOUNT_INDEX } from "./open-amount-collision";
import { WEBSITE_LOOKUP_LIMITS, websiteLookupAllowed } from "./fast-website";
import { describeSecurityEvent } from "./security-events";

describe("wallet-change code recipient", () => {
  it("owners confirm with their own email", () => {
    expect(codeRecipient({ isOwner: true, isPlatformAdmin: false })).toBe("self");
  });
  it("platform admins confirm with their own email", () => {
    expect(codeRecipient({ isOwner: false, isPlatformAdmin: true })).toBe("self");
  });
  it("a full-access team member needs the owner's code", () => {
    expect(codeRecipient({ isOwner: false, isPlatformAdmin: false })).toBe("owner");
  });
});

describe("free trial clock", () => {
  it("never restarts once started", () => {
    expect(freeTierStartPatch("2026-10-01T00:00:00Z")).toEqual({});
  });
  it("starts the first time", () => {
    const now = new Date("2026-11-15T00:00:00Z");
    expect(freeTierStartPatch(null, now)).toEqual({ free_tier_started_at: "2026-11-15T00:00:00.000Z" });
  });
});

describe("shared-address amount collisions", () => {
  it("recognises only the open-amount unique index", () => {
    expect(isOpenAmountCollision({ code: "23505", message: `duplicate key value violates unique constraint "${OPEN_AMOUNT_INDEX}"` })).toBe(true);
    expect(isOpenAmountCollision({ code: "23505", message: 'duplicate key value violates unique constraint "invoices_pkey"' })).toBe(false);
    expect(isOpenAmountCollision({ code: "42501", message: OPEN_AMOUNT_INDEX })).toBe(false);
    expect(isOpenAmountCollision(null)).toBe(false);
  });
});

describe("Fast Start website lookup cap", () => {
  it("allows 10 lookups per visitor per 10 minutes", () => {
    expect(WEBSITE_LOOKUP_LIMITS.perVisitor).toBe(10);
    expect(WEBSITE_LOOKUP_LIMITS.perVisitorWindowSec).toBe(600);
    expect(websiteLookupAllowed(10, 1)).toBe(true);
    expect(websiteLookupAllowed(11, 1)).toBe(false);
  });
  it("allows 200 lookups site-wide per hour", () => {
    expect(websiteLookupAllowed(1, 200)).toBe(true);
    expect(websiteLookupAllowed(1, 201)).toBe(false);
  });
});

describe("tap-to-pay payout alerts", () => {
  it("names the new address and when it takes over", () => {
    const { subject, lines } = describeSecurityEvent(
      { kind: "payout_address_changed", detail: { old_address: null, new_address: "0xabc", scheduled: true, activates_at: "2026-11-15T05:00:00Z" }, created_at: "2026-11-15T01:00:00Z" },
      { storeName: "Sample Store", actorEmail: "x@y.com" },
    );
    expect(subject).toContain("Sample Store");
    expect(lines.join("\n")).toContain("0xabc");
    expect(lines.join("\n")).toContain("Sun, 15 Nov 2026 05:00:00 GMT");
  });
});
