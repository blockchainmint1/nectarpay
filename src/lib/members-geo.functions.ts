// Admin-only: aggregated member geo points for the Knowledge heatmap.
// Groups by ZIP (or ~0.1° cell as fallback) so the client renders 7-8k
// weighted points instead of 49k markers.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MemberHeatPoint = { lat: number; lng: number; count: number };

export const getMemberHeatPoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ points: MemberHeatPoint[]; total: number }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Aggregate in SQL via RPC-less approach: pull grouped rows through a view-less query.
    // Use a lightweight raw SQL through postgrest is not possible, so aggregate client-side
    // after streaming a compact projection. 49k rows @ 3 numbers ~ small payload.
    // PostgREST caps responses (default 1000). Page through all rows.
    const pageSize = 1000;
    const all: { lat: number | null; lng: number | null }[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseAdmin
        .from("members_geo")
        .select("lat,lng")
        .eq("country", "US")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
    }
    const data = all;

    const bucket = new Map<string, MemberHeatPoint>();
    for (const r of data ?? []) {
      if (typeof r.lat !== "number" || typeof r.lng !== "number") continue;
      // ~0.05° grid — visually smooth, keeps payload tiny
      const lat = Math.round(r.lat * 20) / 20;
      const lng = Math.round(r.lng * 20) / 20;
      const key = `${lat},${lng}`;
      const cur = bucket.get(key);
      if (cur) cur.count += 1;
      else bucket.set(key, { lat, lng, count: 1 });
    }
    return { points: [...bucket.values()], total: data?.length ?? 0 };
  });
