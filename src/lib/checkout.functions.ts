// Public, unauthenticated invoice lookup for the customer-facing checkout page.
// Returns only safe DTO fields — never owner_id, never webhook secrets.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({ id: z.string().min(4).max(64) });

export interface CheckoutPaymentOption {
  /** Chain key (e.g. "eth", "tron"). */
  chain: string;
  /** Token symbol if this option is a stablecoin (e.g. "USDC"), null for native. */
  tokenSymbol: string | null;
  /** Stable id used in selectInvoiceChain — "chain" or "chain:SYMBOL". */
  key: string;
  /** Display label e.g. "Ethereum" or "USDC on Base". */
  label: string;
}

export const getPublicInvoice = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const { readPublicInvoice } = await import("./checkout.server");
    return readPublicInvoice(data);
  });



// Customer-side payment picker. Accepts either a bare chain key ("eth") or
// a chain+token combo ("eth:USDC"). Derives the receiving address + quote
// on demand.
const SelectSchema = z.object({
  id: z.string().min(4).max(64),
  /** "chain" or "chain:SYMBOL" */
  option: z.string().min(2).max(32),
});


export const selectInvoiceChain = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SelectSchema.parse(d))
  .handler(async ({ data }) => {
    const { selectPublicInvoiceChain } = await import("./checkout.server");
    return selectPublicInvoiceChain(data);
  });

// Reset selection so the customer can re-pick. Only allowed while pending
// and before any transaction has been observed.
const ClearSchema = z.object({ id: z.string().min(4).max(64) });
export const clearInvoiceChain = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ClearSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error } = await supabaseAdmin
      .from("invoices")
      .select("id, status, expires_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Invoice not found.");
    if (inv.status !== "pending") throw new Error("Invoice is no longer pending.");
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      throw new Error("Invoice has expired.");
    }
    const { count } = await supabaseAdmin
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", inv.id);
    if ((count ?? 0) > 0) {
      throw new Error("A payment has already been detected — option can't be changed.");
    }
    const { error: updErr } = await supabaseAdmin
      .from("invoices")
      .update({
        chain: null,
        token_symbol: null,
        address: null,
        crypto_amount: null,
        rate: null,
        derivation_index: null,
        address_index: null,
      })
      .eq("id", inv.id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true as const };
  });
