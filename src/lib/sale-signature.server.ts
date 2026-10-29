// Server-only access to stored customer signature images. Every read of a
// signature happens only after the caller has been checked against the sale
// (row level security) or against the sale's terminal, so the bucket itself
// stays private to the app.

import {
  SIGNATURE_BUCKET,
  base64FromBytes,
  parseSignatureDataUrl,
  signatureObjectPath,
  type ParsedSignature,
  type SignatureRow,
} from "@/lib/sale-signature";

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Writes the signature image file and returns its path, or null on failure. */
export async function storeSaleSignature(invoiceId: string, signature: ParsedSignature): Promise<string | null> {
  const path = signatureObjectPath(invoiceId, signature.mime);
  try {
    const { storage } = await adminClient();
    const { error } = await storage
      .from(SIGNATURE_BUCKET)
      .upload(path, new Blob([signature.bytes], { type: signature.mime }), {
        contentType: signature.mime,
        upsert: true,
      });
    if (error) {
      console.error("[signature] file could not be stored", { invoiceId, message: error.message });
      return null;
    }
    return path;
  } catch (error) {
    console.error("[signature] file could not be stored", { invoiceId, message: (error as Error)?.message });
    return null;
  }
}

/**
 * Returns the sale's signature file path. A sale whose signature is still an
 * inline copy on the record is moved into storage here, so old sales become
 * files the first time anyone needs them.
 */
export async function ensureSignatureFile(row: SignatureRow): Promise<string | null> {
  if (row.signature_path) return row.signature_path;
  if (!row.signature_data_url) return null;
  const parsed = parseSignatureDataUrl(row.signature_data_url);
  if (!parsed) return null;
  const path = await storeSaleSignature(row.id, parsed);
  if (!path) return null;
  const { from } = await adminClient();
  const { error } = await from("invoices").update({ signature_path: path }).eq("id", row.id);
  if (error) console.error("[signature] path could not be recorded", { invoiceId: row.id, message: error.message });
  return path;
}

/** Reads a stored signature back as bytes plus base64 for embedding. */
export async function readSignatureFile(path: string): Promise<ParsedSignature | null> {
  try {
    const { storage } = await adminClient();
    const { data, error } = await storage.from(SIGNATURE_BUCKET).download(path);
    if (error || !data) return null;
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (bytes.length === 0) return null;
    const mime = /\.(jpe?g)$/i.test(path) ? "image/jpeg" : "image/png";
    return { base64: base64FromBytes(bytes), mime, bytes };
  } catch {
    return null;
  }
}

/**
 * Signature for a sale the caller is allowed to see, as a data URL ready for
 * an <img> tag or a download. Never called before an ownership check.
 */
export async function signatureDataUrlForRow(row: SignatureRow): Promise<string | null> {
  const path = await ensureSignatureFile(row);
  if (!path) return null;
  const signature = await readSignatureFile(path);
  if (!signature) return null;
  return `data:${signature.mime};base64,${signature.base64}`;
}
