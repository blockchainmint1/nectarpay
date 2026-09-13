// Per-store notification overrides. When a store has an override row, it
// replaces the account-level preferences for events tied to that store.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface StoreNotificationPref {
  store_id: string;
  store_name: string;
  has_override: boolean;
  enabled: boolean;
  email_enabled: boolean;
  email_address: string | null;
  telegram_enabled: boolean;
  events: Record<string, boolean>;
}

export const listStoreNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoreNotificationPref[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stores } = await supabaseAdmin
      .from("stores")
      .select("id, name")
      .eq("owner_id", context.userId)
      .is("deactivated_at", null)
      .order("name");
    const ids = (stores ?? []).map((s) => s.id);
    if (!ids.length) return [];
    const { data: prefs } = await supabaseAdmin
      .from("store_notification_prefs")
      .select("*")
      .eq("user_id", context.userId)
      .in("store_id", ids);
    const byStore = new Map((prefs ?? []).map((p) => [p.store_id, p]));
    return (stores ?? []).map((s) => {
      const p = byStore.get(s.id);
      return {
        store_id: s.id,
        store_name: s.name,
        has_override: !!p,
        enabled: p?.enabled ?? true,
        email_enabled: p?.email_enabled ?? false,
        email_address: p?.email_address ?? null,
        telegram_enabled: p?.telegram_enabled ?? false,
        events: ((p?.events as Record<string, boolean>) ?? {}) as Record<string, boolean>,
      };
    });
  });

const saveSchema = z.object({
  storeId: z.string().uuid(),
  enabled: z.boolean().default(true),
  email_enabled: z.boolean().default(false),
  email_address: z.string().trim().max(255).nullable().optional(),
  telegram_enabled: z.boolean().default(false),
  events: z.record(z.string(), z.boolean()).default({}),
});

export const saveStoreNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store) throw new Error("Store not found");
    const { error } = await supabaseAdmin.from("store_notification_prefs").upsert(
      {
        store_id: data.storeId,
        user_id: context.userId,
        enabled: data.enabled,
        email_enabled: data.email_enabled,
        email_address: data.email_address || null,
        telegram_enabled: data.telegram_enabled,
        events: data.events as never,
      },
      { onConflict: "store_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearStoreNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ storeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("store_notification_prefs")
      .delete()
      .eq("store_id", data.storeId)
      .eq("user_id", context.userId);
    return { ok: true };
  });
