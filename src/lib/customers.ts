import { z } from "zod";

export const customerContactSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  marketing_opt_in: z.boolean().optional().default(false),
});
export const marketingConsentText = (storeName: string) => `Send me updates and special deals from ${storeName}.`;
export type CustomerSale = { store_id: string; customer_email: string | null; buyer_email: string | null; status: string; fiat_amount: number; fiat_currency: string; created_at: string; chain: string | null; token_symbol: string | null };
export type CustomerConsent = { store_id: string; email: string; consented_at: string; revoked_at: string | null };
export function aggregateCustomers(sales: CustomerSale[], consents: CustomerConsent[]) {
  const customers = new Map<string, { storeId: string; email: string; purchases: number; totals: Record<string, number>; firstPurchase: string; lastPurchase: string; methods: string[]; optedIn: boolean; consentedAt: string | null }>();
  for (const sale of sales) {
    const email = (sale.customer_email || sale.buyer_email || "").trim().toLowerCase();
    if (!email || !["confirmed", "overpaid"].includes(sale.status)) continue;
    const key = `${sale.store_id}:${email}`;
    const customer = customers.get(key) ?? { storeId: sale.store_id, email, purchases: 0, totals: {}, firstPurchase: sale.created_at, lastPurchase: sale.created_at, methods: [], optedIn: false, consentedAt: null };
    customer.purchases++;
    const currency = sale.fiat_currency.toUpperCase();
    customer.totals[currency] = Math.round(((customer.totals[currency] ?? 0) + Number(sale.fiat_amount)) * 100) / 100;
    customer.firstPurchase = [customer.firstPurchase, sale.created_at].sort()[0];
    customer.lastPurchase = [customer.lastPurchase, sale.created_at].sort().at(-1) ?? sale.created_at;
    const symbol = sale.token_symbol || ({ eth: "ETH", base: "ETH", bsc: "BNB", tron: "TRX", sol: "SOL", lightning: "BTC" }[sale.chain ?? ""] ?? sale.chain?.toUpperCase() ?? "Unknown");
    const method = `${symbol} · ${sale.chain ?? "unknown"}`;
    if (!customer.methods.includes(method)) customer.methods.push(method);
    customers.set(key, customer);
  }
  for (const consent of consents) {
    const key = `${consent.store_id}:${consent.email.toLowerCase()}`;
    const customer = customers.get(key) ?? { storeId: consent.store_id, email: consent.email, purchases: 0, totals: {}, firstPurchase: "", lastPurchase: "", methods: [], optedIn: false, consentedAt: null };
    customer.optedIn = !consent.revoked_at;
    customer.consentedAt = consent.consented_at;
    customers.set(key, customer);
  }
  return [...customers.values()].sort((a, b) => b.lastPurchase.localeCompare(a.lastPurchase) || a.email.localeCompare(b.email));
}
export function customersCsv(rows: ReturnType<typeof aggregateCustomers>, storeNames: Record<string, string>) {
  const cell = (value: unknown) => {
    let s = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [["Store", "Email", "Purchases", "Total spent", "First purchase", "Last purchase", "Payment methods", "Marketing opt-in", "Consent date"], ...rows.map(c => [storeNames[c.storeId] ?? c.storeId, c.email, c.purchases, Object.entries(c.totals).map(([currency, value]) => `${value.toFixed(2)} ${currency}`).join("; "), c.firstPurchase, c.lastPurchase, c.methods.join("; "), c.optedIn ? "Yes" : "No", c.consentedAt])].map(row => row.map(cell).join(",")).join("\r\n");
}