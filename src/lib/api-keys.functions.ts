import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  // url-safe base64-ish
  return Array.from(arr)
    .map((b) => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[b % 62])
    .join("");
}

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ storeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("api_keys")
      .select("id, label, prefix, last_used_at, revoked_at, created_at")
      .eq("store_id", data.storeId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ storeId: z.string().uuid(), label: z.string().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Verify caller owns the store (RLS would block anyway, but be explicit).
    const { data: store, error: sErr } = await context.supabase
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!store) throw new Error("Store not found or not yours.");

    const secret = randomToken(40);
    const fullKey = `sk_live_${secret}`;
    const prefix = fullKey.slice(0, 16);
    const secret_hash = await sha256Hex(fullKey);

    const { data: row, error } = await context.supabase
      .from("api_keys")
      .insert({ store_id: data.storeId, label: data.label, prefix, secret_hash })
      .select("id, label, prefix, created_at")
      .single();
    if (error) throw new Error(error.message);

    // Return the full key ONCE — never stored, never shown again.
    return { ...row, fullKey };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ keyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.keyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
