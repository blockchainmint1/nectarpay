// Merchant-authenticated virtual terminal: create an invoice on behalf
// of the signed-in merchant (no API key required). Customer picks the
// payment network on the hosted checkout page.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  store_id: z.string().uuid(),
  amount: z.number().positive().max(1_000_000),
  currency: z.string().min(3).max(8).optional(),
  description: z.string().max(512).optional(),
  buyer_email: z.string().email().max(255).optional(),
});

export const createVirtualInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Confirm the caller owns the store — RLS also blocks, but a clean
    // 403 message is more useful than a silent empty insert.
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, fiat_currency, invoice_ttl_seconds")
      .eq("id", data.store_id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (storeErr) throw new Error(storeErr.message);
    if (!store) throw new Error("Store not found or not yours.");

    const ttl = store.invoice_ttl_seconds ?? 900;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    const currency = data.currency || store.fiat_currency || "USD";

    const { data: inserted, error: insErr } = await supabase
      .from("invoices")
      .insert({
        store_id: store.id,
        chain: null,
        fiat_amount: data.amount,
        fiat_currency: currency,
        crypto_amount: null,
        rate: null,
        address: null,
        derivation_index: null,
        address_index: null,
        status: "pending",
        description: data.description ?? "Virtual terminal",
        buyer_email: data.buyer_email ?? null,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (insErr || !inserted) throw new Error(insErr?.message ?? "Insert failed.");

    return {
      id: inserted.id,
      fiat_amount: data.amount,
      currency,
      expires_at: expiresAt,
      checkout_path: `/i/${inserted.id}`,
    };
  });

const StatusInput = z.object({ invoice_id: z.string().uuid() });

export const getVirtualInvoiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inv, error } = await supabase
      .from("invoices")
      .select("id, status, chain, address, crypto_amount, fiat_amount, fiat_currency, expires_at, store_id, stores!inner(owner_id)")
      .eq("id", data.invoice_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv || (inv as { stores: { owner_id: string } }).stores.owner_id !== userId) {
      throw new Error("Invoice not found.");
    }
    return {
      id: inv.id,
      status: inv.status,
      chain: inv.chain,
      address: inv.address,
      crypto_amount: inv.crypto_amount,
      fiat_amount: inv.fiat_amount,
      fiat_currency: inv.fiat_currency,
      expires_at: inv.expires_at,
    };
  });

const CancelInput = z.object({ invoice_id: z.string().uuid() });

export const cancelVirtualInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CancelInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, store_id, status, stores!inner(owner_id)")
      .eq("id", data.invoice_id)
      .maybeSingle();
    if (!inv || (inv as { stores: { owner_id: string } }).stores.owner_id !== userId) {
      throw new Error("Invoice not found.");
    }
    if (inv.status === "pending") {
      await supabase.from("invoices").update({ status: "cancelled" }).eq("id", inv.id);
    }
    return { ok: true };
  });
