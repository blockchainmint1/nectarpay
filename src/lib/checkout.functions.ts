// Public, unauthenticated invoice lookup for the customer-facing checkout page.
// Returns only safe DTO fields — never owner_id, never webhook secrets.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({ id: z.string().min(8).max(64) });

export const getPublicInvoice = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error } = await supabaseAdmin
      .from("invoices")
      .select(
        "id, chain, fiat_amount, fiat_currency, crypto_amount, rate, address, status, description, redirect_url, expires_at, created_at, store_id",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return { found: false as const };

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("name, website")
      .eq("id", inv.store_id)
      .maybeSingle();

    const { data: txs } = await supabaseAdmin
      .from("transactions")
      .select("tx_hash, amount, confirmations, confirmed_at, first_seen_at")
      .eq("invoice_id", inv.id)
      .order("first_seen_at", { ascending: false });

    return {
      found: true as const,
      invoice: {
        id: inv.id,
        chain: inv.chain,
        fiatAmount: Number(inv.fiat_amount),
        fiatCurrency: inv.fiat_currency,
        cryptoAmount: inv.crypto_amount == null ? null : Number(inv.crypto_amount),
        rate: inv.rate == null ? null : Number(inv.rate),
        address: inv.address,
        status: inv.status,
        description: inv.description,
        redirectUrl: inv.redirect_url,
        expiresAt: inv.expires_at,
        createdAt: inv.created_at,
      },
      store: store ? { name: store.name, website: store.website } : null,
      transactions: (txs ?? []).map((t) => ({
        hash: t.tx_hash,
        amount: t.amount == null ? null : Number(t.amount),
        confirmations: t.confirmations ?? 0,
        confirmedAt: t.confirmed_at,
        firstSeenAt: t.first_seen_at,
      })),
    };
  });
