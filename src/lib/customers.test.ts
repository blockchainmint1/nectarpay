import { describe, expect, it } from "vitest";
import { aggregateCustomers, customerContactSchema, customersCsv, type CustomerSale } from "./customers";

const sale: CustomerSale = { store_id: "store-a", customer_email: " Buyer@Example.com ", buyer_email: null, status: "confirmed", fiat_amount: 1500, fiat_currency: "USD", created_at: "2026-10-24T12:00:00Z", chain: "txc", token_symbol: "TSD" };
describe("merchant customers", () => {
  it("groups normalized emails with counts, totals, dates and tokens from paid history", () => {
    const rows = aggregateCustomers([sale, { ...sale, fiat_amount: 25, created_at: "2026-10-23T12:00:00Z", token_symbol: null }, { ...sale, status: "pending", fiat_amount: 9000 }], []);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: "buyer@example.com", purchases: 2, totals: { USD: 1525 }, firstPurchase: "2026-10-23T12:00:00Z", lastPurchase: sale.created_at, methods: ["TSD · txc", "TXC · txc"] });
  });
  it("keeps customer records and currencies separate across stores", () => {
    const rows = aggregateCustomers([sale, { ...sale, fiat_currency: "EUR", fiat_amount: 10 }, { ...sale, store_id: "store-b" }], []);
    expect(rows).toHaveLength(2);
    expect(rows.find(c => c.storeId === "store-a")?.totals).toEqual({ USD: 1500, EUR: 10 });
  });
  it("never opts historical receipt customers into marketing", () => {
    expect(aggregateCustomers([sale], [])[0].optedIn).toBe(false);
  });
  it("defaults a missing signup checkbox to false and requires a boolean", () => {
    expect(customerContactSchema.parse({ email: "buyer@example.com" }).marketing_opt_in).toBe(false);
    expect(customerContactSchema.safeParse({ email: "buyer@example.com", marketing_opt_in: "true" }).success).toBe(false);
  });
  it("applies explicit consent only to the same email and store", () => {
    const rows = aggregateCustomers([sale, { ...sale, store_id: "store-b" }], [{ store_id: "store-a", email: "buyer@example.com", consented_at: sale.created_at, revoked_at: null }]);
    expect(rows.find(c => c.storeId === "store-a")?.optedIn).toBe(true);
    expect(rows.find(c => c.storeId === "store-b")?.optedIn).toBe(false);
  });
  it("revoked consent is not eligible for marketing", () => {
    expect(aggregateCustomers([sale], [{ store_id: "store-a", email: "buyer@example.com", consented_at: sale.created_at, revoked_at: sale.created_at }])[0].optedIn).toBe(false);
  });
  it("exports preferences and totals, escaping spreadsheet formulas", () => {
    const csv = customersCsv(aggregateCustomers([sale], []), { "store-a": "=EVIL()" });
    expect(csv).toContain('"\'=EVIL()"');
    expect(csv).toContain('"1500.00 USD"');
    expect(csv).toContain('"No"');
  });
});