import * as React from "react";
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Link } from "@react-email/components";

export function receiptBreakdown(description: string | null, total: number) {
  const values = Object.fromEntries([...((description ?? "").matchAll(/\b(subtotal|tax|tip):(\d+)\b/g))].map((m) => [m[1], Number(m[2])]));
  const subtotal = values.subtotal;
  const tax = values.tax ?? 0;
  const tip = values.tip ?? 0;
  if (subtotal === undefined || !Number.isSafeInteger(subtotal + tax + tip) || Math.abs(subtotal + tax + tip - Math.round(total * 100)) > 1) return null;
  return { subtotal: subtotal / 100, tax: tax / 100, tip: tip / 100 };
}

export function receiptEligible(status: string) { return status === "confirmed" || status === "overpaid"; }

export interface CustomerReceiptData {
  storeName: string; invoiceId: string; total: number; currency: string;
  paymentMethod: string; description: string | null; orderId: string | null;
}

export function CustomerReceipt(data: CustomerReceiptData) {
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(n);
  const breakdown = receiptBreakdown(data.description, data.total);
  return <Html><Head /><Preview>Your payment receipt from {data.storeName} · {money(data.total)}</Preview>
    <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif", color: "#263247" }}>
      <Container style={{ maxWidth: 600, padding: "32px 24px" }}>
        <Section style={{ backgroundColor: "#0D1B33", padding: 24, borderBottom: "4px solid #F6A21E" }}>
          <Text style={{ color: "#F6A21E", fontWeight: 800, fontSize: 22, margin: 0 }}>NectarPay</Text>
          <Text style={{ color: "#ffffff", marginBottom: 0 }}>Receipt from {data.storeName}</Text>
        </Section>
        <Heading>Thank you for your payment!</Heading>
        <Text>Your payment to <strong>{data.storeName}</strong> is complete. Keep this receipt for your records.</Text>
        <Section style={{ backgroundColor: "#FFF8E8", padding: 24, textAlign: "center" }}>
          <Text style={{ margin: 0 }}>Invoice total · Paid</Text>
          <Heading style={{ fontSize: 36, margin: "8px 0" }}>{money(data.total)}</Heading>
        </Section>
        {breakdown && <><Text>Subtotal: {money(breakdown.subtotal)}</Text><Text>Tax: {money(breakdown.tax)}</Text><Text>Tip: {money(breakdown.tip)}</Text></>}
        <Text>Payment method: {data.paymentMethod}</Text>
        <Text>Receipt reference: {data.invoiceId}</Text>
        {data.orderId && <Text>Order reference: {data.orderId}</Text>}
        <Hr /><Text style={{ fontSize: 12 }}>Sent by NectarPay on behalf of {data.storeName}. This receipt does not sign you up for marketing.</Text>
        <Text style={{ fontSize: 12 }}>Part of the <Link href="https://honest.money">honest.money ecosystem</Link></Text>
        <Text style={{ fontSize: 12 }}><Link href="https://app.nectar-pay.com/terms">Terms</Link> · <Link href="https://app.nectar-pay.com/privacy">Privacy</Link> · <Link href="https://app.nectar-pay.com/manifesto">Manifesto</Link></Text>
      </Container>
    </Body></Html>;
}