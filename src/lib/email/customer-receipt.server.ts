import * as React from "react";
import { render } from "@react-email/render";
import { CustomerReceipt, receiptEligible } from "./customer-receipt";
import { sendSesEmail } from "./ses.server";
import { SIGNATURE_CID, signatureFileName } from "@/lib/sale-signature";

/** Called only after an authorized feature has validated its invoice. */
export async function sendCustomerReceipt(invoiceId: string): Promise<{ sent: boolean; error?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: invoice, error } = await supabaseAdmin.from("invoices")
    .select("id,status,customer_email,buyer_email,fiat_amount,fiat_currency,chain,token_symbol,description,external_order_id,payment_program,discount_usd,discount_pct,signature_path,signature_data_url,stores(name)")
    .eq("id", invoiceId).single();
  if (error || !invoice) return { sent: false, error: "Receipt could not be loaded" };
  if (!receiptEligible(invoice.status)) return { sent: false, error: "Payment is not complete" };
  const to = invoice.customer_email || invoice.buyer_email;
  if (!to) return { sent: false };
  const label = "customer_receipt";
  // The existing log's primary key provides a receipt-specific atomic claim.
  const { error: claimError } = await supabaseAdmin.from("email_send_log").insert({
    id: invoiceId, message_id: invoiceId, template_name: label, recipient_email: to, status: "pending",
  });
  if (claimError) {
    if (claimError.code !== "23505") return { sent: false, error: "Receipt could not be recorded" };
    const { data: previous } = await supabaseAdmin.from("email_send_log").select("status").eq("id", invoiceId).single();
    if (previous?.status === "sent") return { sent: true };
    if (previous?.status !== "failed") return { sent: false, error: "Receipt sending is already in progress; do not send again" };
    const { data: retry } = await supabaseAdmin.from("email_send_log").update({ status: "pending", recipient_email: to, error_message: null }).eq("id", invoiceId).eq("status", "failed").select("id");
    if (!retry?.length) return { sent: false, error: "Receipt sending is already in progress" };
  }
  try {
    const store = invoice.stores as { name: string | null } | null;
    const storeName = store?.name || "Your merchant";
    const element = React.createElement(CustomerReceipt, {
      storeName, invoiceId, total: Number(invoice.fiat_amount), currency: invoice.fiat_currency || "USD",
      paymentMethod: [invoice.token_symbol, invoice.chain?.toUpperCase()].filter(Boolean).join(" on "),
      description: invoice.description, orderId: invoice.external_order_id,
      egiving: invoice.payment_program === "egiving" && invoice.discount_usd ? { discount: Number(invoice.discount_usd), pct: Number(invoice.discount_pct ?? 10) } : null,
      signatureCid: signature ? SIGNATURE_CID : null,
    });
    const result = await sendSesEmail({
      to, subject: `Your receipt from ${storeName}`, html: await render(element), text: await render(element, { plainText: true }),
      inline: signature
        ? [{ cid: SIGNATURE_CID, filename: signatureFileName(invoiceId, signature.mime), contentType: signature.mime, base64: signature.base64 }]
        : undefined,
    });
    await supabaseAdmin.from("email_send_log").update({ status: "sent", message_id: result.messageId }).eq("id", invoiceId);
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Receipt send failed";
    await supabaseAdmin.from("email_send_log").update({ status: "failed", error_message: message.slice(0, 500) }).eq("id", invoiceId);
    console.error("[receipt] send failed", { invoiceId, message });
    return { sent: false, error: "The receipt could not be sent. Please try again." };
  }
}