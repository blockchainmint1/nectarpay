import { describe, expect, it } from "vitest";
import { decideAward, popForAmount, type AwardInput } from "./pop-rewards";

const now = new Date("2026-10-30T12:00:00Z");
const base: AwardInput = {
  invoiceStatus: "confirmed", fiatCurrency: "USD", saleUsd: 69, paidAt: now,
  storeCreatedAt: new Date("2026-01-01T00:00:00Z"), storeEnabled: true,
  shopperIsOwner: false, payerIsStoreWallet: false, shopperStorePopToday: 0, storePopToday: 0, now,
};

describe("POP rewards", () => {
  it("$69 earns 69 POP", () => expect(popForAmount(69)).toBe(69));
  it("rounds partial dollars up to whole POP", () => {
    expect(popForAmount(68.75)).toBe(69);
    expect(popForAmount(0.5)).toBe(1);
  });
  it("Give Back sale earns on the full sale amount", () => expect(decideAward({ ...base, saleUsd: 69 }).pop).toBe(69));
  it("merchant paying their own store gets nothing", () => {
    expect(decideAward({ ...base, shopperIsOwner: true }).status).toBe("denied");
    expect(decideAward({ ...base, payerIsStoreWallet: true }).status).toBe("denied");
  });
  it("unpaid or underpaid sales earn nothing", () => expect(decideAward({ ...base, invoiceStatus: "underpaid" }).status).toBe("denied"));
  it("stores under 14 days old are held", () => {
    expect(decideAward({ ...base, storeCreatedAt: new Date("2026-10-25T00:00:00Z") }).status).toBe("held");
  });
  it("over 250 POP per shopper per store per day is held", () => {
    expect(decideAward({ ...base, shopperStorePopToday: 200 }).status).toBe("held");
    expect(decideAward({ ...base, shopperStorePopToday: 181 }).status).toBe("eligible");
  });
});
