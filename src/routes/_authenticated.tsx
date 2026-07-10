import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Store, BookOpen, LogOut, CreditCard, Bell, Download, Smartphone, UserRound } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { readAffiliateSnapshot, clearAffiliateSnapshot } from "@/lib/affiliate";
import { recordAffiliateAttribution } from "@/lib/affiliate.functions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  // Attribute a signup to a mineTXC affiliate (first-touch). Runs once per
  // signed-in session if we have a stashed ?r=<id>; the server enforces
  // first-touch, so re-runs are safe. We clear the cookie either way.
  useEffect(() => {
    if (loading || !user) return;
    const snap = readAffiliateSnapshot();
    if (!snap) return;
    recordAffiliateAttribution({ data: snap })
      .catch(() => { /* non-blocking */ })
      .finally(() => { clearAffiliateSnapshot(); });
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  // The /m/* merchant mobile shell owns its own chrome (sticky mobile
  // header + bottom nav). Render it bare, without the desktop sidebar.
  const pathname = router.state.location.pathname;
  if (pathname === "/m" || pathname.startsWith("/m/")) {
    return <Outlet />;
  }
  // Admin owns its own chrome (left nav with admin-only routes).
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return <Outlet />;
  }


  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar p-4 md:flex">
        <Link to="/" className="flex items-center gap-2 px-2 py-2 font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary glow" />
          <span className="text-sm">Nectar<span className="text-primary">-PAY</span></span>
        </Link>

        <nav className="mt-6 flex flex-col gap-1">
          <NavItem to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
            Overview
          </NavItem>
          <NavItem to="/stores" icon={<Store className="h-4 w-4" />}>
            Stores
          </NavItem>
          <NavItem to="/terminals" icon={<Smartphone className="h-4 w-4" />}>
            Terminals
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
        <div className="sticky top-0 z-30 flex h-12 items-center justify-end gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
          <div className="md:hidden">
            <ThemeToggle />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <UserRound className="h-4 w-4" />
                <span className="max-w-[160px] truncate text-xs">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
                {user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={async (e) => {
                  e.preventDefault();
                  await signOut();
                  navigate({ to: "/" });
                }}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
