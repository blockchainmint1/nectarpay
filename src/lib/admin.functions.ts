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
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const [users, stores, invoices, wallets] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id", { count: "exact", head: true }),
      supabaseAdmin.from("stores").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("invoices").select("id, status, fiat_amount, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("wallet_accounts").select("wallet_address", { count: "exact", head: true }),
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
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.user_id);
    const [wallets, roles] = await Promise.all([
      supabaseAdmin.from("wallet_accounts").select("user_id, wallet_address, last_login_at").in("user_id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);

    const walletMap = new Map(
      (wallets.data ?? []).map((w) => [w.user_id, w]),
    );
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
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("stores")
      .select("id, name, owner_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAdminInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .select("id, store_id, status, fiat_amount, chain, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
