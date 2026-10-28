import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only: store a partner's shared signing key. Only an 8-char fingerprint is ever readable afterwards. */
export const setCardPartnerSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), secret: z.string().min(24).max(256) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { createHash } = await import("crypto");
    const secret = data.secret.trim();
    const fingerprint = createHash("sha256").update(secret).digest("hex").slice(0, 8);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("card_partners")
      .update({ secret, secret_fingerprint: fingerprint, uses_legacy_secret: false }).eq("id", data.id);
    if (error) throw new Error("Could not save the key.");
    return { fingerprint, length: secret.length };
  });
