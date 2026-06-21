// Merchant-facing server functions to manage the outbound webhook config:
// view URL, set URL, rotate the signing secret (returned once).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function randomSecret(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[b % 62])
    .join("");
}

type AuthSupabase = Awaited<ReturnType<typeof import("@/integrations/supabase/auth-middleware").requireSupabaseAuth>> extends never ? never : never;

async function assertOwnsStore(
  supabase: { from: typeof import("@supabase/supabase-js").SupabaseClient.prototype.from } | any,
  storeId: string,
) {
  const { data, error } = await supabase.from("stores").select("id").eq("id", storeId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Store not found or not yours.");
}

export const getWebhookConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ storeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("stores")
      .select("id, webhook_url")
      .eq("id", data.storeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Store not found or not yours.");

    // The presence flag has to come through service role, since the column is
    // revoked from the authenticated role.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: secRow } = await supabaseAdmin
      .from("stores")
      .select("webhook_secret")
      .eq("id", data.storeId)
      .maybeSingle();
    return {
      webhook_url: row.webhook_url as string | null,
      has_secret: Boolean((secRow as { webhook_secret: string | null } | null)?.webhook_secret),
    };
  });

export const setWebhookUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        storeId: z.string().uuid(),
        url: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwnsStore(context.supabase, data.storeId);
    const trimmed = (data.url ?? "").trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      throw new Error("Webhook URL must start with http:// or https://");
    }
    const { error } = await context.supabase
      .from("stores")
      .update({ webhook_url: trimmed || null })
      .eq("id", data.storeId);
    if (error) throw new Error(error.message);
    return { ok: true, webhook_url: trimmed || null };
  });

export const rotateWebhookSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ storeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwnsStore(context.supabase, data.storeId);
    const secret = `whsec_${randomSecret(40)}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("stores")
      .update({ webhook_secret: secret })
      .eq("id", data.storeId);
    if (error) throw new Error(error.message);
    // Returned ONCE — never stored anywhere we'd hand back to the client again.
    return { secret };
  });
