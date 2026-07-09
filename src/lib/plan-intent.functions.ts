import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VALID_PLANS = new Set(["free", "cheap", "unlimited"]);
const VALID_SOURCES = new Set(["pricing", "terminal_kit", "signup"]);

export const recordPlanIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan_id: string; source?: string; terminal_kit?: boolean }) => {
    if (!VALID_PLANS.has(d.plan_id)) throw new Error("Invalid plan_id");
    if (d.source && !VALID_SOURCES.has(d.source)) throw new Error("Invalid source");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    const update: Record<string, unknown> = {
      chosen_plan_id: data.plan_id,
      chosen_plan_at: now,
      chosen_plan_source: data.source ?? "pricing",
    };
    if (data.terminal_kit) update.terminal_kit_ordered_at = now;

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update(update)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
