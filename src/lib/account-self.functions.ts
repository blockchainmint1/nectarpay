import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Merchant closes one of their own stores. Sales history is kept. */
export const closeMyStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { store_id: string; reason?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const mod = await import("@/lib/account-admin.server");
    return await mod.closeStoreForOwner(context.userId, data.store_id);
  });

/**
 * Merchant closes their entire account: personal info is wiped, contact is
 * suppressed, everything goes offline, sign-in is blocked. Invoices and
 * transactions stay in the records.
 */
export const closeMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reason?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const mod = await import("@/lib/account-admin.server");
    return await mod.deactivateAccount(
      context.userId,
      data.reason ? `Self-service close: ${data.reason}` : "Closed by account owner",
      context.userId,
    );
  });
