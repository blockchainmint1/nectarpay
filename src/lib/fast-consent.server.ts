// Server-only storage for Fast Start merchant signatures. The signature a
// merchant draws on the public /fast page is kept as a real image file in the
// private fast-start-signatures bucket; the enrollment row only records the
// file's path and the moment it was signed. Every read goes through an admin
// check first, so the bucket itself stays closed to the browser.

import {
  base64FromBytes,
  parseSignatureDataUrl,
  toArrayBuffer,
  type ParsedSignature,
} from "@/lib/sale-signature";
import { FAST_SIGNATURE_BUCKET } from "@/lib/fast-consent";

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** One image per enrollment, named after the enrollment id so nothing collides. */
export function fastSignaturePath(enrollmentId: string, mime = "image/png"): string {
  return `${enrollmentId}.${mime === "image/jpeg" ? "jpg" : "png"}`;
}

/**
 * Saves the signature drawn in the browser as an image file and returns its
 * path, or null when the drawing isn't a real image or the upload failed.
 */
export async function storeFastSignature(
  enrollmentId: string,
  signatureDataUrl: string,
): Promise<string | null> {
  const parsed = parseSignatureDataUrl(signatureDataUrl);
  if (!parsed) return null;
  const path = fastSignaturePath(enrollmentId, parsed.mime);
  try {
    const client = await adminClient();
    const { error } = await client.storage
      .from(FAST_SIGNATURE_BUCKET)
      .upload(path, new Blob([toArrayBuffer(parsed.bytes)], { type: parsed.mime }), {
        contentType: parsed.mime,
        upsert: false,
      });
    if (error) {
      console.error("[fast] signature file could not be stored", { enrollmentId, message: error.message });
      return null;
    }
    return path;
  } catch (error) {
    console.error("[fast] signature file could not be stored", {
      enrollmentId,
      message: (error as Error)?.message,
    });
    return null;
  }
}

/** Cleans up an orphaned file when the enrollment record itself never saved. */
export async function removeFastSignature(path: string): Promise<void> {
  try {
    const client = await adminClient();
    await client.storage.from(FAST_SIGNATURE_BUCKET).remove([path]);
  } catch (error) {
    console.error("[fast] signature file could not be removed", {
      path,
      message: (error as Error)?.message,
    });
  }
}

/** Reads a stored signature back as bytes plus base64 for embedding. */
export async function readFastSignature(path: string): Promise<ParsedSignature | null> {
  try {
    const client = await adminClient();
    const { data, error } = await client.storage.from(FAST_SIGNATURE_BUCKET).download(path);
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
 * A stored signature as a data URL ready for an <img> tag. Only ever called
 * after the caller has been confirmed as an administrator.
 */
export async function fastSignatureDataUrl(path: string): Promise<string | null> {
  const signature = await readFastSignature(path);
  if (!signature) return null;
  return `data:${signature.mime};base64,${signature.base64}`;
}
