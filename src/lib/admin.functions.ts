import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Throws 403 if caller is not an admin. */
async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [users, stores, invoices, wallets] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id", { count: "exact", head: true }),
      supabaseAdmin.from("stores").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("invoices")
        .select("id, status, fiat_amount, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("wallet_accounts")
        .select("wallet_address", { count: "exact", head: true }),
    ]);

    return {
      user_count: users.count ?? 0,
      store_count: stores.count ?? 0,
      wallet_count: wallets.count ?? 0,
      invoice_count: invoices.count ?? 0,
      recent_invoices: invoices.data ?? [],
    };
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.user_id);
    const [wallets, roles] = await Promise.all([
      supabaseAdmin
        .from("wallet_accounts")
        .select("user_id, wallet_address, last_login_at")
        .in("user_id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);

    const walletMap = new Map((wallets.data ?? []).map((w) => [w.user_id, w]));
    const roleMap = new Map<string, string[]>();
    for (const r of roles.data ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }

    return (profiles ?? []).map((p) => ({
      user_id: p.user_id,
      display_name: p.full_name ?? "—",
      created_at: p.created_at,
      wallet_address: walletMap.get(p.user_id)?.wallet_address ?? null,
      last_login_at: walletMap.get(p.user_id)?.last_login_at ?? null,
      roles: roleMap.get(p.user_id) ?? [],
    }));
  });

export const listAdminStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stores, error } = await supabaseAdmin
      .from("stores")
      .select("id, name, owner_id, fiat_currency, business_city, business_country, admin_market, admin_rep, admin_notes, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const ownerIds = Array.from(new Set((stores ?? []).map((s) => s.owner_id)));
    const storeIds = (stores ?? []).map((s) => s.id);

    const [profilesRes, subsRes, invoicesRes] = await Promise.all([
      ownerIds.length
        ? supabaseAdmin.from("profiles").select("user_id, email, full_name").in("user_id", ownerIds)
        : Promise.resolve({ data: [] as any[] }),
      ownerIds.length
        ? supabaseAdmin
            .from("subscriptions")
            .select("user_id, plan_id, status, current_period_end, grace_period_ends_at")
            .in("user_id", ownerIds)
        : Promise.resolve({ data: [] as any[] }),
      storeIds.length
        ? supabaseAdmin
            .from("invoices")
            .select("store_id, status, fiat_amount")
            .in("store_id", storeIds)
            .in("status", ["confirmed", "overpaid", "underpaid"])
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p]));
    const subMap = new Map((subsRes.data ?? []).map((s: any) => [s.user_id, s]));
    const aggMap = new Map<string, { count: number; total: number }>();
    for (const inv of invoicesRes.data ?? []) {
      const cur = aggMap.get((inv as any).store_id) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number((inv as any).fiat_amount) || 0;
      aggMap.set((inv as any).store_id, cur);
    }

    return (stores ?? []).map((s) => {
      const sub: any = subMap.get(s.owner_id);
      const profile: any = profileMap.get(s.owner_id);
      const agg = aggMap.get(s.id) ?? { count: 0, total: 0 };
      const derivedMarket = [s.business_city, s.business_country].filter(Boolean).join(", ");
      return {
        id: s.id,
        name: s.name,
        owner_id: s.owner_id,
        owner_email: profile?.email ?? null,
        owner_name: profile?.full_name ?? null,
        fiat_currency: s.fiat_currency,
        market: s.admin_market ?? (derivedMarket || null),
        rep: s.admin_rep ?? null,
        notes: s.admin_notes ?? null,
        plan_id: sub?.plan_id ?? "free",
        sub_status: sub?.status ?? null,
        expires_at: sub?.current_period_end ?? sub?.grace_period_ends_at ?? null,
        created_at: s.created_at,
        tx_count: agg.count,
        total_sales: agg.total,
      };
    });
  });

export const updateAdminStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { store_id: string; market?: string | null; rep?: string | null; notes?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.market !== undefined) patch.admin_market = data.market || null;
    if (data.rep !== undefined) patch.admin_rep = data.rep || null;
    if (data.notes !== undefined) patch.admin_notes = data.notes || null;
    const { error } = await supabaseAdmin.from("stores").update(patch).eq("id", data.store_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAdminInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .select("id, store_id, status, fiat_amount, chain, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
