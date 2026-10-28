import { describe, expect, it } from "vitest";
import { normalizeDomains, pickCardPartner } from "./card-partners";

const partners = [
  { id: "cryptopop", card_domains: ["cryptopop.org"], is_default: true, active: true },
  { id: "hme", card_domains: ["hmewallet.com"], is_default: false, active: true },
  { id: "off", card_domains: ["offwallet.com"], is_default: false, active: false },
];

describe("card partner routing", () => {
  it("routes a card to the partner whose domain is on it", () => {
    expect(pickCardPartner(partners, "https://pay.hmewallet.com/c/abc")?.id).toBe("hme");
  });
  it("falls back to the default partner for cards without a known address", () => {
    expect(pickCardPartner(partners, null)?.id).toBe("cryptopop");
    expect(pickCardPartner(partners, "https://unknown.example/c")?.id).toBe("cryptopop");
  });
  it("never routes to a switched-off partner", () => {
    expect(pickCardPartner(partners, "https://offwallet.com/x")?.id).toBe("cryptopop");
  });
  it("does not match lookalike domains", () => {
    expect(pickCardPartner(partners, "https://evilhmewallet.com/x")?.id).toBe("cryptopop");
  });
  it("cleans typed domains", () => {
    expect(normalizeDomains("https://CryptoPOP.org/x, hmewallet.com bad")).toEqual(["cryptopop.org", "hmewallet.com"]);
  });
});
