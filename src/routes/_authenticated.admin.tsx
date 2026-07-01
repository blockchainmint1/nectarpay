import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: adminRole, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (error || !adminRole) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link to="/admin" className="text-sm font-bold uppercase tracking-[0.3em]">
              Nectar<span className="text-primary">-PAY</span> · admin
            </Link>
            <nav className="flex gap-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <Link
                to="/admin"
                activeProps={{ className: "text-foreground" }}
                activeOptions={{ exact: true }}
              >
                Overview
              </Link>
              <Link to="/admin/leads" activeProps={{ className: "text-foreground" }}>
                Leads
              </Link>
              <Link to="/admin/users" activeProps={{ className: "text-foreground" }}>
                Users
              </Link>

              <Link to="/admin/stores" activeProps={{ className: "text-foreground" }}>
                Stores
              </Link>
              <Link to="/admin/invoices" activeProps={{ className: "text-foreground" }}>
                Invoices
              </Link>
              <Link to="/admin/knowledge" activeProps={{ className: "text-foreground" }}>
                Knowledge
              </Link>

            </nav>
          </div>
          <Link
            to="/dashboard"
            className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
          >
            ← Merchant view
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
