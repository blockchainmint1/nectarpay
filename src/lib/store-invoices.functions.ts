// Merchant invoicing: create a payment request, email it to a customer,
// list / resend / cancel. All calls are scoped to a store the caller owns.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SELECT_COLS =
  "id, store_id, fiat_amount, fiat_currency, status, description, buyer_email, customer_email, external_order_id, chain, token_symbol, crypto_amount, address, expires_at, created_at, updated_at, email_sent_at, email_send_count, first_viewed_at, last_viewed_at, view_count";

const ListInput = z.object({ store_id: z.string().uuid() });

export const listStoreInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("invoices")
      .select(SELECT_COLS)
      .eq("store_id", data.store_id)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const CreateInput = z.object({
  store_id: z.string().uuid(),
  amount: z.number().positive().max(1_000_000),
  currency: z.string().min(3).max(8).optional(),
  description: z.string().max(512).optional(),
  memo: z.string().max(1000).optional(),
  buyer_email: z.string().email().max(255).optional(),
  external_order_id: z.string().max(128).optional(),
  expires_days: z.number().int().min(1).max(60).optional(),
  send_email: z.boolean().optional(),
});

export const createStoreInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, name, fiat_currency")
      .eq("id", data.store_id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (storeErr) throw new Error(storeErr.message);
    if (!store) throw new Error("Store not found or not yours.");

    const currency = data.currency || store.fiat_currency || "USD";
    const days = data.expires_days ?? 7;
    const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
    const wantsEmail = Boolean(data.send_email && data.buyer_email);

    const { data: inserted, error: insErr } = await supabase
      .from("invoices")
      .insert({
        store_id: store.id,
        chain: null,
        fiat_amount: data.amount,
        fiat_currency: currency,
        status: "pending",
        description: data.description ?? "Invoice",
        buyer_email: data.buyer_email ?? null,
        customer_email: data.buyer_email ?? null,
        external_order_id: data.external_order_id ?? null,
        expires_at: expiresAt,
      })
      .select(SELECT_COLS)
      .single();
    if (insErr || !inserted) throw new Error(insErr?.message ?? "Could not create invoice.");

    let emailed = false;
    let emailError: string | undefined;
    if (wantsEmail) {
      const { sendInvoiceEmail } = await import("@/lib/store-invoices.server");
      const res = await sendInvoiceEmail(data.buyer_email!, {
        invoiceId: inserted.id,
        storeName: store.name,
        amount: data.amount,
        currency,
        description: data.description ?? null,
        memo: data.memo ?? null,
        expiresAt,
      });
      emailed = res.ok;
      emailError = res.error;
      if (res.ok) {
        await supabase
          .from("invoices")
          .update({ email_sent_at: new Date().toISOString(), email_send_count: 1 })
          .eq("id", inserted.id);
      }
    }

    return { invoice: inserted, emailed, emailError, checkout_path: `/i/${inserted.id}` };
  });

const IdInput = z.object({ invoice_id: z.string().uuid() });

export const resendStoreInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    IdInput.extend({ to: z.string().email().max(255).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inv, error } = await supabase
      .from("invoices")
      .select(
        "id, store_id, fiat_amount, fiat_currency, description, buyer_email, customer_email, status, expires_at, email_send_count, stores!inner(name, owner_id)",
      )
      .eq("id", data.invoice_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const store = (inv as unknown as { stores: { name: string; owner_id: string } } | null)?.stores;
    if (!inv || !store || store.owner_id !== userId) throw new Error("Invoice not found.");
    if (["confirmed", "overpaid", "cancelled"].includes(inv.status)) {
      throw new Error("This invoice is already closed.");
    }

    const to = data.to ?? inv.buyer_email ?? inv.customer_email;
    if (!to) throw new Error("No customer email on this invoice.");

    // Push the expiry out so a re-sent link stays payable.
    const expiresAt =
      new Date(inv.expires_at).getTime() < Date.now() + 86_400_000
        ? new Date(Date.now() + 7 * 86_400_000).toISOString()
        : inv.expires_at;

    const { sendInvoiceEmail } = await import("@/lib/store-invoices.server");
    const res = await sendInvoiceEmail(to, {
      invoiceId: inv.id,
      storeName: store.name,
      amount: Number(inv.fiat_amount),
      currency: inv.fiat_currency,
      description: inv.description,
      expiresAt,
      reminder: true,
    });
    if (!res.ok) throw new Error(res.error ?? "Could not send email.");

    await supabase
      .from("invoices")
      .update({
        email_sent_at: new Date().toISOString(),
        email_send_count: (inv.email_send_count ?? 0) + 1,
        expires_at: expiresAt,
        buyer_email: to,
        customer_email: to,
      })
      .eq("id", inv.id);

    return { ok: true, to };
  });

export const cancelStoreInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, status, stores!inner(owner_id)")
      .eq("id", data.invoice_id)
      .maybeSingle();
    const owner = (inv as unknown as { stores: { owner_id: string } } | null)?.stores.owner_id;
    if (!inv || owner !== userId) throw new Error("Invoice not found.");
    if (["confirmed", "overpaid"].includes(inv.status)) {
      throw new Error("Paid invoices cannot be cancelled.");
    }
    const { error } = await supabase
      .from("invoices")
      .update({ status: "cancelled" })
      .eq("id", inv.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
