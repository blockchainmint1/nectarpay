// Public, unauthenticated invoice lookup for the customer-facing checkout page.
// Returns only safe DTO fields — never owner_id, never webhook secrets.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({ id: z.string().min(4).max(64) });

export const getPublicInvoice = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    // Synthetic demo invoice — powers the live SDK demo on /docs without DB seeding.
    if (data.id === "demo") {
      return {
        found: true as const,
        invoice: {
          id: "demo",
          chain: "btc" as string | null,
          fiatAmount: 1,
          fiatCurrency: "USD",
          cryptoAmount: 0.00001 as number | null,
          rate: 100000 as number | null,
          address: "bc1qexampledemoaddressxxxxxxxxxxxxxxxxxxx" as string | null,
          status: "pending" as const,
          description: "payHME live demo — no payment will be processed",
          redirectUrl: null,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        store: { name: "payHME demo", website: "https://pay.honest.money" },
        transactions: [] as Array<{ hash: string; amount: number | null; confirmations: number; confirmedAt: string | null; firstSeenAt: string | null }>,
        availableChains: [] as string[],
      };

    }

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

    // When chain hasn't been selected yet, surface the merchant's enabled
    // chains so the customer can choose on the hosted checkout.
    let availableChains: string[] = [];
    let qrAddressOnly = false;
    if (!inv.chain) {
      const { data: cfgs } = await supabaseAdmin
        .from("chain_configs")
        .select("chain")
        .eq("store_id", inv.store_id)
        .eq("enabled", true);
      availableChains = (cfgs ?? []).map((c) => c.chain as string);
    } else {
      const { data: cfg } = await supabaseAdmin
        .from("chain_configs")
        .select("qr_address_only")
        .eq("store_id", inv.store_id)
        .eq("chain", inv.chain)
        .maybeSingle();
      qrAddressOnly = !!cfg?.qr_address_only;
    }

    return {
      found: true as const,
      invoice: {
        id: inv.id,
        chain: inv.chain as string | null,
        fiatAmount: Number(inv.fiat_amount),
        fiatCurrency: inv.fiat_currency,
        cryptoAmount: inv.crypto_amount == null ? null : Number(inv.crypto_amount),
        rate: inv.rate == null ? null : Number(inv.rate),
        address: inv.address as string | null,
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
      availableChains,
      qrAddressOnly,
    };
  });


// Customer-side chain picker: the customer picks a payment network on the
// hosted checkout page and we derive the address + quote on demand.
const SelectSchema = z.object({
  id: z.string().min(4).max(64),
  chain: z.enum(["btc", "txc", "eth", "base", "tron", "sol", "doge", "isk", "zcu"]),
});

export const selectInvoiceChain = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SelectSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deriveInvoiceAddress } = await import("@/lib/invoice-derive.server");

    const { data: inv, error } = await supabaseAdmin
      .from("invoices")
      .select("id, store_id, chain, status, fiat_amount, expires_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Invoice not found.");
    if (inv.chain) throw new Error("Invoice already has a chain selected.");
    if (inv.status !== "pending") throw new Error("Invoice is no longer pending.");
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      throw new Error("Invoice has expired.");
    }

    const derived = await deriveInvoiceAddress(inv.store_id, data.chain, Number(inv.fiat_amount));

    const { error: updErr } = await supabaseAdmin
      .from("invoices")
      .update({
        chain: data.chain,
        address: derived.address,
        crypto_amount: derived.cryptoAmount,
        rate: derived.rate,
        derivation_index: derived.index,
        address_index: derived.index,
      })
      .eq("id", inv.id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true as const };
  });
