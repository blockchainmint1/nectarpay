// Public server functions for the Terminal Kit checkout on /checkout.
// Creates an invoice against the internal "Blockchain Mint" merchant store
// and a linked kit_orders row that BM picks up once payment confirms.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// House store used to issue kit-checkout invoices. Owned by bobby@ ,
// same merchant that fulfills the physical kit.
const KIT_STORE_ID = "4a12d520-5dd5-4f70-86b3-2f084978dbaa";
const KIT_PRICE_USD = 499;
const FIRST_YEAR_PRICE_USD = 228;
const INVOICE_TTL_SECONDS = 60 * 60; // 1h — buyer needs time to fund from cold storage

const CreateInput = z.object({
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  ship_line1: z.string().trim().min(2).max(200),
  ship_line2: z.string().trim().max(200).optional().nullable(),
  ship_city: z.string().trim().min(1).max(120),
  ship_region: z.string().trim().max(120).optional().nullable(),
  ship_postal: z.string().trim().min(2).max(30),
  ship_country: z.string().trim().min(2).max(60),
  include_first_year: z.boolean().default(true),
});

export const createKitCheckout = createServerFn({ method: "POST" })
  .inputValidator((raw) => CreateInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const subtotal = data.include_first_year
      ? KIT_PRICE_USD + FIRST_YEAR_PRICE_USD
      : KIT_PRICE_USD;
    const total = subtotal; // flat shipping baked in for v1

    const expiresAt = new Date(Date.now() + INVOICE_TTL_SECONDS * 1000).toISOString();

    // 1. Create a pending-chain invoice — buyer picks BTC/TXC/USDC on /i/{id}.
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("invoices")
      .insert({
        store_id: KIT_STORE_ID,
        chain: null,
        fiat_amount: total,
        fiat_currency: "USD",
        crypto_amount: null,
        rate: null,
        address: null,
        derivation_index: null,
        address_index: null,
        status: "pending",
        external_order_id: null,
        description: data.include_first_year
          ? "NectarPay Terminal Kit + First-Year Service"
          : "NectarPay Terminal Kit",
        buyer_email: data.email,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (invErr || !invoice) {
      throw new Error(invErr?.message ?? "Could not create invoice");
    }

    // 2. Create the kit_orders row linked to the invoice.
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("kit_orders")
      .insert({
        invoice_id: invoice.id,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone ?? null,
        ship_line1: data.ship_line1,
        ship_line2: data.ship_line2 ?? null,
        ship_city: data.ship_city,
        ship_region: data.ship_region ?? null,
        ship_postal: data.ship_postal,
        ship_country: data.ship_country,
        include_first_year: data.include_first_year,
        kit_price_usd: KIT_PRICE_USD,
        first_year_price_usd: FIRST_YEAR_PRICE_USD,
        subtotal_usd: subtotal,
        total_usd: total,
        status: "pending_payment",
      })
      .select("id")
      .single();
    if (orderErr || !order) {
      throw new Error(orderErr?.message ?? "Could not create kit order");
    }

    // Point invoice back at the kit order so ops can trace it.
    await supabaseAdmin
      .from("invoices")
      .update({ external_order_id: order.id })
      .eq("id", invoice.id);

    return {
      order_id: order.id,
      invoice_id: invoice.id,
      pay_url: `/i/${invoice.id}`,
      subtotal_usd: subtotal,
      total_usd: total,
    };
  });

const GetInput = z.object({ order_id: z.string().uuid() });

export const getKitOrderPublic = createServerFn({ method: "GET" })
  .inputValidator((raw) => GetInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("kit_orders")
      .select(
        "id, email, full_name, include_first_year, subtotal_usd, total_usd, status, invoice_id, bm_order_number, ship_city, ship_country, created_at",
      )
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) throw new Error("Order not found");

    let invoice_status: string | null = null;
    if (order.invoice_id) {
      const { data: inv } = await supabaseAdmin
        .from("invoices")
        .select("status")
        .eq("id", order.invoice_id)
        .maybeSingle();
      invoice_status = inv?.status ?? null;
    }

    return { ...order, invoice_status };
  });
