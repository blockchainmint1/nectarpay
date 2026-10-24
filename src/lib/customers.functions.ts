import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { aggregateCustomers, customerContactSchema, type CustomerSale, type CustomerConsent } from "./customers";

export const getCustomers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: stores, error } = await context.supabase.from("stores").select("id, name").order("name");
  if (error) throw new Error("Could not load stores.");
  const sales: CustomerSale[] = [];
  for (let start = 0; ; start += 1000) {
    const result = await context.supabase.from("invoices").select("store_id, customer_email, buyer_email, status, fiat_amount, fiat_currency, created_at, chain, token_symbol").in("status", ["confirmed", "overpaid"]).order("id").range(start, start + 999);
    if (result.error) throw new Error("Could not load customer purchases.");
    sales.push(...result.data);
    if (result.data.length < 1000) break;
  }
  const consents: CustomerConsent[] = [];
  for (let start = 0; ; start += 1000) {
    const result = await context.supabase.from("customer_marketing_consents").select("store_id, email, consented_at, revoked_at").order("id").range(start, start + 999);
    if (result.error) throw new Error("Could not load signup preferences.");
    consents.push(...result.data);
    if (result.data.length < 1000) break;
  }
  return { stores: stores ?? [], customers: aggregateCustomers(sales, consents) };
});

export const saveCheckoutContact = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => customerContactSchema.extend({ invoiceId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invoice, error } = await supabaseAdmin.from("invoices").select("id, store_id, status, expires_at, customer_email, buyer_email").eq("id", data.invoiceId).maybeSingle();
    if (error || !invoice) throw new Error("Invoice not found.");
    const paid = ["confirmed", "overpaid"].includes(invoice.status);
    if (!paid && (!["pending", "detected", "underpaid"].includes(invoice.status) || Date.parse(invoice.expires_at) < Date.now())) throw new Error("This invoice is closed.");
    if (invoice.customer_email && invoice.customer_email.toLowerCase() !== data.email) throw new Error("A receipt email has already been saved for this invoice.");
    if (invoice.buyer_email && invoice.buyer_email.toLowerCase() !== data.email) throw new Error("Use the email associated with this invoice.");
    if (!invoice.customer_email) {
      const { data: updated, error: updateError } = await supabaseAdmin.from("invoices").update({ customer_email: data.email }).eq("id", invoice.id).is("customer_email", null).select("id");
      if (updateError || !updated?.length) throw new Error("Could not save receipt email. Please reload and try again.");
    }
    const { recordCustomerConsent } = await import("./customer-consent.server");
    await recordCustomerConsent(invoice.store_id, invoice.id, data.email, data.marketing_opt_in, "checkout");
    if (paid) {
      const { sendCustomerReceipt } = await import("./email/customer-receipt.server");
      const result = await sendCustomerReceipt(invoice.id);
      if (!result.sent) throw new Error("Email saved, but the receipt could not be sent. Please retry.");
    }
    return { ok: true };
  });