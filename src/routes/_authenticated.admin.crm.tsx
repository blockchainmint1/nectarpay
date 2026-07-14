import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { UsersRound, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/crm")({
  component: CrmLayout,
});

function CrmLayout() {
  return (
    <div className="grid gap-6 md:grid-cols-[180px_1fr]">
      <nav className="flex md:flex-col gap-1 md:sticky md:top-16 self-start">
        <SubNavItem to="/admin/crm/leads" icon={<UsersRound className="h-4 w-4" />}>
          Leads
        </SubNavItem>
        <SubNavItem to="/admin/crm/markets" icon={<MapPin className="h-4 w-4" />}>
          Markets
        </SubNavItem>
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

function SubNavItem({
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
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
      activeProps={{ className: "bg-sidebar-accent text-foreground font-medium" }}
    >
      {icon} {children}
    </Link>
  );
}
