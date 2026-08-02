// Bottom tab bar shown only on small screens (phones / POS terminals).
// The desktop sidebars in the merchant + admin shells are hidden below `md`,
// which previously left mobile users with no navigation at all.

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TabItem {
  to: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}

export function MobileTabBar({
  items,
  more = [],
}: {
  items: TabItem[];
  more?: TabItem[];
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-flow-col border-t border-border/60 bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      {items.map((it) => (
        <Link
          key={it.to}
          to={it.to}
          activeOptions={it.exact ? { exact: true } : undefined}
          className="flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium text-muted-foreground active:bg-accent"
          activeProps={{ className: "text-primary" }}
        >
          <span className="shrink-0">{it.icon}</span>
          <span className="w-full truncate text-center">{it.label}</span>
        </Link>
      ))}

      {more.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium text-muted-foreground active:bg-accent">
            <MoreHorizontal className="h-5 w-5 shrink-0" />
            <span>More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52">
            {more.map((it) => (
              <DropdownMenuItem key={it.to} asChild>
                <Link to={it.to} className="flex items-center gap-2 py-2.5">
                  {it.icon} {it.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
}
