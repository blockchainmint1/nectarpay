// Server-only: forwards a paid kit_order to BlockchainMint's fulfillment intake.
// Called from settleInvoice() the moment an invoice flips to `confirmed`.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BM_URL = process.env.BM_FULFILLMENT_URL;
const BM_SECRET = process.env.BM_FULFILLMENT_SECRET;

export async function forwardKitOrderToBmForInvoice(invoiceId: string): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from("kit_orders")
    .select(
      "id, user_id, email, full_name, phone, ship_line1, ship_line2, ship_city, ship_region, ship_postal, ship_country, include_first_year, kit_price_usd, first_year_price_usd, subtotal_usd, total_usd, status, bm_order_id, bm_attempt_count, invoice_id",
    )
    .eq("invoice_id", invoiceId)
    .maybeSingle();

  if (!order) return; // not a kit order
  if (order.bm_order_id || order.status === "submitted_to_bm" || order.status === "shipped") return;

  // Mark paid first regardless of BM outcome.
  if (order.status === "pending_payment") {
    await supabaseAdmin.from("kit_orders").update({ status: "paid" }).eq("id", order.id);
    // Award any affiliate for this referred buyer. Fire-and-forget: an
    // affiliate outage must not block fulfillment.
    if (order.user_id) {
      void awardAffiliateForKitPurchase(order.user_id, order.id);
    }
  }


  if (!BM_URL || !BM_SECRET) {
    await supabaseAdmin
      .from("kit_orders")
      .update({
        bm_last_error: "BM_FULFILLMENT_URL/BM_FULFILLMENT_SECRET not configured",
        bm_attempt_count: (order.bm_attempt_count ?? 0) + 1,
        status: "bm_failed",
      })
      .eq("id", order.id);
    return;
  }

  const line_items: Array<{ sku: string; name: string; qty: number; unit_price_usd: number }> = [
    {
      sku: "nectarpay-kit",
      name: "NectarPay Terminal Kit",
      qty: 1,
      unit_price_usd: Number(order.kit_price_usd),
    },
  ];
  if (order.include_first_year) {
    line_items.push({
      sku: "nectarpay-first-year",
      name: "NectarPay First-Year Service",
      qty: 1,
      unit_price_usd: Number(order.first_year_price_usd),
    });
  }

  const body = {
    external_order_id: order.id,
    source: "nectarpay",
    email: order.email,
    full_name: order.full_name,
    phone: order.phone,
    shipping: {
      line1: order.ship_line1,
      line2: order.ship_line2,
      city: order.ship_city,
      region: order.ship_region,
      postal_code: order.ship_postal,
      country: order.ship_country,
    },
    line_items,
    subtotal_usd: Number(order.subtotal_usd),
    total_usd: Number(order.total_usd),
    payment: {
      status: "paid",
      invoice_id: order.invoice_id,
      currency: "USD",
    },
  };

  try {
    const res = await fetch(BM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BM_SECRET}`,
      },
      body: JSON.stringify(body),
    });

    const attempt = (order.bm_attempt_count ?? 0) + 1;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      await supabaseAdmin
        .from("kit_orders")
        .update({
          status: "bm_failed",
          bm_last_error: `HTTP ${res.status}: ${text.slice(0, 500)}`,
          bm_attempt_count: attempt,
        })
        .eq("id", order.id);
      return;
    }

    const json = (await res.json().catch(() => ({}))) as {
      order_id?: string | number;
      order_number?: string | number;
    };

    await supabaseAdmin
      .from("kit_orders")
      .update({
        status: "submitted_to_bm",
        bm_order_id: json.order_id != null ? String(json.order_id) : null,
        bm_order_number: json.order_number != null ? String(json.order_number) : null,
        bm_synced_at: new Date().toISOString(),
        bm_last_error: null,
        bm_attempt_count: attempt,
      })
      .eq("id", order.id);
  } catch (err) {
    await supabaseAdmin
      .from("kit_orders")
      .update({
        status: "bm_failed",
        bm_last_error: err instanceof Error ? err.message : "Unknown error",
        bm_attempt_count: (order.bm_attempt_count ?? 0) + 1,
      })
      .eq("id", order.id);
  }
}

/**
 * General-affiliate program award: when a referred merchant buys the
 * Merchant Start-up Kit, create a pending_choice reward row for the
 * affiliate. Idempotent via affiliate_rewards.referred_user_id UNIQUE.
 * mineTXC-only affiliate ids (not present in affiliate_codes) are
 * skipped silently — miners are awarded via mineTXC's own hash-power flow.
 */
async function awardAffiliateForKitPurchase(
  referredUserId: string,
  kitOrderId: string,
): Promise<void> {
  try {
    const { data: att } = await supabaseAdmin
      .from("affiliate_attributions")
      .select("affiliate_id")
      .eq("user_id", referredUserId)
      .maybeSingle();
    if (!att?.affiliate_id) return;

    const { data: codeRow } = await supabaseAdmin
      .from("affiliate_codes")
      .select("user_id")
      .eq("code", att.affiliate_id)
      .maybeSingle();
    if (!codeRow?.user_id) return; // mineTXC or unknown code
    if (codeRow.user_id === referredUserId) return; // self-referral guard

    const { error } = await supabaseAdmin.from("affiliate_rewards").insert({
      affiliate_user_id: codeRow.user_id,
      referred_user_id: referredUserId,
      kit_order_id: kitOrderId,
      status: "pending_choice",
    });
    if (error && !/duplicate|unique/i.test(error.message)) {
      console.error("[affiliate-award] insert failed", error.message);
    }
  } catch (e) {
    console.error("[affiliate-award] failed", e);
  }
}

