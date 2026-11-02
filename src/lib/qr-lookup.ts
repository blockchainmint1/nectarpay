import { z } from "zod";

/** Body for the signed wallet QR lookup: a scanned sale id, or just the scanned address. */
export const QrLookup = z.union([
  z.object({ request_id: z.string().uuid(), invoice_id: z.string().uuid() }).strict(),
  z.object({ request_id: z.string().uuid(), address: z.string().regex(/^[A-Za-z0-9:]{20,120}$/) }).strict(),
]);

/** Reads the `inv=` sale hint from a scanned payment code (never trusted on its own). */
export function invoiceHintFromQr(raw: string): string | null {
  const q = raw.indexOf("?");
  if (q < 0) return null;
  const v = new URLSearchParams(raw.slice(q + 1)).get("inv");
  return v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v.toLowerCase() : null;
}
