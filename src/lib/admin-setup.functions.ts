import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SetupStage = "no_wallet" | "coins_off" | "stopped";

export type UnfinishedStore = {
  id: string;
  slug: string | null;
  name: string;
  owner_email: string | null;
  city: string | null;
  created_at: string;
  stage: SetupStage;
  has_terminal: boolean;
  sales: number;
  last_sale_at: string | null;
};

/** Active, non-hidden stores with no payable coin switched on (so they're kept out of the public directory). */
export const listUnfinishedStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UnfinishedStore[]> => {
    // Verify admin through the caller's own RLS-scoped session.
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stores, error } = await supabaseAdmin
      .from("stores")
      .select("id, url_slug, name, owner_id, business_city, created_at")
      .is("deactivated_at", null)
      .neq("listing_visibility", "hidden")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    const ids = (stores ?? []).map((s) => s.id);
    if (!ids.length) return [];

    const [chains, terms, invs] = await Promise.all([
      supabaseAdmin.from("chain_configs").select("store_id, chain, enabled, xpub, xpub_or_address").in("store_id", ids),
      supabaseAdmin.from("terminals").select("store_id").in("store_id", ids).is("revoked_at", null),
      supabaseAdmin.from("invoices").select("store_id, created_at").in("store_id", ids).in("status", ["confirmed", "overpaid", "underpaid"]),
    ]);

    const live = new Set<string>();
    const wallet = new Set<string>();
    for (const c of chains.data ?? []) {
      if (c.enabled && c.chain !== "lightning") live.add(c.store_id);
      if (c.xpub || c.xpub_or_address) wallet.add(c.store_id);
    }
    const term = new Set((terms.data ?? []).map((t) => t.store_id));
    const sales = new Map<string, { n: number; last: string }>();
    for (const i of invs.data ?? []) {
      const cur = sales.get(i.store_id) ?? { n: 0, last: i.created_at };
      cur.n += 1;
      if (i.created_at > cur.last) cur.last = i.created_at;
      sales.set(i.store_id, cur);
    }

    const pending = (stores ?? []).filter((s) => !live.has(s.id));
    const owners = Array.from(new Set(pending.map((s) => s.owner_id)));
    const { data: profiles } = owners.length
      ? await supabaseAdmin.from("profiles").select("user_id, email").in("user_id", owners)
      : { data: [] as { user_id: string; email: string | null }[] };
    const email = new Map((profiles ?? []).map((p) => [p.user_id, p.email]));

    return pending.map((s) => {
      const sale = sales.get(s.id);
      const stage: SetupStage = sale ? "stopped" : wallet.has(s.id) ? "coins_off" : "no_wallet";
      return {
        id: s.id,
        slug: s.url_slug,
        name: s.name,
        owner_email: email.get(s.owner_id) ?? null,
        city: s.business_city,
        created_at: s.created_at,
        stage,
        has_terminal: term.has(s.id),
        sales: sale?.n ?? 0,
        last_sale_at: sale?.last ?? null,
      };
    });
  });
