import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Store, BookOpen, LogOut, CreditCard, Bell, Download } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      navigate({
        to: "/auth",
        search: { mode: "signin", redirect: router.state.location.pathname },
      });
    }
  }, [user, loading, navigate, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar p-4 md:flex">
        <Link to="/" className="flex items-center gap-2 px-2 py-2 font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary glow" />
          <span className="text-sm">pay<span className="text-primary">HME</span></span>
        </Link>

        <nav className="mt-6 flex flex-col gap-1">
          <NavItem to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
            Overview
          </NavItem>
          <NavItem to="/stores" icon={<Store className="h-4 w-4" />}>
            Stores
          </NavItem>
          <NavItem to="/billing" icon={<CreditCard className="h-4 w-4" />}>
            Billing
          </NavItem>
          <NavItem to="/notifications" icon={<Bell className="h-4 w-4" />}>
            Notifications
          </NavItem>
          <NavItem to="/exports" icon={<Download className="h-4 w-4" />}>
            Exports
          </NavItem>
          <NavItem to="/docs" icon={<BookOpen className="h-4 w-4" />}>
            Docs
          </NavItem>
        </nav>

        <div className="mt-auto border-t border-border/60 pt-4">
          <div className="px-2 text-xs text-muted-foreground">Signed in as</div>
          <div className="truncate px-2 text-sm">{user.email}</div>
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
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground" }}
    >
      {icon} {children}
    </Link>
  );
}
