// Server functions for the merchant terminals admin UI.
// (Pairing + invoice creation from the device run through the
// public HMAC endpoints under /api/public/v1/terminals/*, NOT here.)

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listTerminals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ storeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("terminals")
      .select("id, label, last_seen_at, revoked_at, created_at")
      .eq("store_id", data.storeId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createPairingCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ storeId: z.string().uuid(), label: z.string().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Confirm caller owns the store (RLS would also block).
    const { data: store, error: sErr } = await context.supabase
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!store) throw new Error("Store not found or not yours.");

    const { generatePairingCode } = await import("@/lib/terminals.server");

    // Retry a few times on (very unlikely) code collision.
    let lastErr: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generatePairingCode(6);
      const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
      const { data: row, error } = await context.supabase
        .from("terminal_pairing_codes")
        .insert({ store_id: data.storeId, label: data.label, code, expires_at: expiresAt })
        .select("id, code, label, expires_at")
        .single();
      if (!error && row) return row;
      lastErr = error?.message ?? "insert failed";
      // Only retry on uniqueness violation
      if (!/duplicate|unique/i.test(lastErr)) break;
    }
    throw new Error(lastErr ?? "Could not issue pairing code.");
  });

export const revokeTerminal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ terminalId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("terminals")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.terminalId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameTerminal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ terminalId: z.string().uuid(), label: z.string().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("terminals")
      .update({ label: data.label })
      .eq("id", data.terminalId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
