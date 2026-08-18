import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Store, BookOpen, LogOut, CreditCard, Bell, Download, Smartphone, UserRound, Users } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardShell } from "@/components/dashboard-shell";

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
        search: { mode: "choose", redirect: router.state.location.pathname },
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


  return <DashboardShell><Outlet /></DashboardShell>;
}
