// Public "virtual terminal" links.
//
// A merchant creates a persistent slug (e.g. /t/ron-paul-institute) that
// anyone can open. The page renders a POS-terminal look-alike running the
// real payment flow against the merchant's linked wallets. Optional
// ?amount= pre-fills the charge.
//
// Reads/writes here are unauthenticated on purpose — the page is meant to
// be emailed and re-shared. All writes are bounded: slug must be active,
// amount must sit inside the merchant's own min/max.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SlugInput = z.object({ slug: z.string().min(2).max(64) });

export const getPublicTerminal = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => SlugInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: t, error } = await supabaseAdmin
      .from("public_terminals")
      .select(
        "id, slug, title, subtitle, cta_label, currency, preset_amounts, allow_custom_amount, min_amount, max_amount, is_donation, active, store_id",
      )
      .eq("slug", data.slug.toLowerCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!t || !t.active) return null;

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("name, fiat_currency, business_logo_url")
      .eq("id", t.store_id)
      .maybeSingle();

    return {
      slug: t.slug,
      title: t.title ?? store?.name ?? "Pay",
      subtitle: t.subtitle,
      cta_label: t.cta_label ?? (t.is_donation ? "Donate" : "Pay"),
      currency: t.currency ?? store?.fiat_currency ?? "USD",
      preset_amounts: (t.preset_amounts ?? []).map(Number),
      allow_custom_amount: t.allow_custom_amount,
      min_amount: Number(t.min_amount),
      max_amount: Number(t.max_amount),
      is_donation: t.is_donation,
      store_name: store?.name ?? null,
      logo_url: store?.business_logo_url ?? null,
    };
  });

const ChargeInput = z.object({
  slug: z.string().min(2).max(64),
  amount: z.number().positive().max(1_000_000),
  note: z.string().max(200).optional(),
  email: z.string().email().max(255).optional(),
});

export const createPublicTerminalInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChargeInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: t, error } = await supabaseAdmin
      .from("public_terminals")
      .select("id, store_id, active, min_amount, max_amount, currency, is_donation, title")
      .eq("slug", data.slug.toLowerCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!t || !t.active) throw new Error("This payment link is no longer active.");

    const amount = Math.round(data.amount * 100) / 100;
    if (amount < Number(t.min_amount) || amount > Number(t.max_amount)) {
      throw new Error(`Amount must be between ${t.min_amount} and ${t.max_amount}.`);
    }

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id, fiat_currency, invoice_ttl_seconds")
      .eq("id", t.store_id)
      .maybeSingle();
    if (!store) throw new Error("Store unavailable.");

    const ttl = store.invoice_ttl_seconds ?? 900;
    const expires_at = new Date(Date.now() + ttl * 1000).toISOString();
    const currency = t.currency ?? store.fiat_currency ?? "USD";

    const { data: inv, error: insErr } = await supabaseAdmin
      .from("invoices")
      .insert({
        store_id: store.id,
        chain: null,
        fiat_amount: amount,
        fiat_currency: currency,
        crypto_amount: null,
        rate: null,
        address: null,
        derivation_index: null,
        address_index: null,
        status: "pending",
        description:
          data.note?.trim() ||
          (t.is_donation ? `Donation · ${t.title ?? "Online"}` : `Virtual terminal · ${t.title ?? "Online"}`),
        buyer_email: data.email ?? null,
        expires_at,
      })
      .select("id")
      .single();
    if (insErr || !inv) throw new Error(insErr?.message ?? "Could not start payment.");

    return { id: inv.id, checkout_path: `/i/${inv.id}`, currency, amount, expires_at };
  });
