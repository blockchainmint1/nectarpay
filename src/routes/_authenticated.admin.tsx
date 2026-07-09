import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, UsersRound, Store as StoreIcon, Receipt, BookOpen, LogOut, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar p-4 md:flex">
        <Link to="/admin" className="flex items-center gap-2 px-2 py-2 font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary glow" />
          <span className="text-sm">
            Nectar<span className="text-primary">-PAY</span>
            <span className="ml-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">admin</span>
          </span>
        </Link>

        <nav className="mt-6 flex flex-col gap-1">
          <NavItem to="/admin" exact icon={<LayoutDashboard className="h-4 w-4" />}>Overview</NavItem>
          <NavItem to="/admin/leads" icon={<UsersRound className="h-4 w-4" />}>Leads</NavItem>
          <NavItem to="/admin/merchants" icon={<StoreIcon className="h-4 w-4" />}>Merchants</NavItem>
          <NavItem to="/admin/invoices" icon={<Receipt className="h-4 w-4" />}>Invoices</NavItem>
          <NavItem to="/admin/knowledge" icon={<BookOpen className="h-4 w-4" />}>Knowledge</NavItem>
        </nav>

        <div className="mt-6 border-t border-border/60 pt-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Merchant view
          </Link>
        </div>

        <div className="mt-auto border-t border-border/60 pt-4">
          <div className="px-2 text-xs text-muted-foreground">Signed in as</div>
          <div className="truncate px-2 text-sm">{user?.email}</div>
          <div className="mt-2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="sticky top-0 z-30 flex h-12 items-center justify-between gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur md:justify-end">
          <Link to="/admin" className="text-xs font-bold uppercase tracking-[0.3em] md:hidden">
            Nectar<span className="text-primary">-PAY</span> · admin
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
            >
              ← Merchant view
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({
  to,
  icon,
  children,
  exact,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      activeOptions={exact ? { exact: true } : undefined}
      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground" }}
    >
      {icon} {children}
    </Link>
  );
}
