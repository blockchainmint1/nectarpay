import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, LogOut, Menu, UserRound } from "lucide-react";
import hiveMark from "@/assets/nectar-hive-mark.png.asset.json";

/**
 * The Nectar.Pay brand mark — honey-gradient beehive dome.
 * Transparent PNG served from the Lovable CDN so it renders crisply at
 * every size from 14px favicon up to the 96px hero badge.
 */
export function NectarMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <img
      src={hiveMark.url}
      alt=""
      aria-hidden="true"
      className={`${className} object-contain select-none`}
      draggable={false}
    />
  );
}


export function NectarWordmark() {
  return (
    <span className="font-semibold tracking-tight">
      Nectar<span className="text-primary">-PAY</span>
    </span>
  );
}

const navLinks = [
  { to: "/where", label: "Where" },
  { to: "/pricing", label: "Pricing" },
  { to: "/compare", label: "Compare" },
  { to: "/docs", label: "Docs" },
  { to: "/integrations", label: "Integrations" },
  { to: "/investors", label: "Investors" },
  { href: "https://beekeeper.honest.money", label: "Wallet", external: true },
];

export function MarketingNav() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <NectarMark className="h-6 w-6" />
          <NectarWordmark />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.to}
                to={link.to}
                className="hover:text-foreground"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <div className="hidden md:flex items-center gap-2">
            {loading ? null : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <UserRound className="h-4 w-4" />
                    <span className="max-w-[160px] truncate">{user.email}</span>
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
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/signup">Start free</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <nav className="mt-8 flex flex-col gap-4 text-base">
                {navLinks.map((link) =>
                  link.external ? (
                    <SheetClose asChild key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    </SheetClose>
                  ) : (
                    <SheetClose asChild key={link.to}>
                      <Link
                        to={link.to}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  )
                )}
              </nav>
              <div className="mt-auto flex flex-col gap-3 border-t border-border/60 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
                {loading ? null : user ? (
                  <Button asChild size="sm">
                    <Link to="/dashboard">Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/auth">Sign in</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link to="/signup">Start free</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-8 text-xs text-muted-foreground md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <NectarMark className="h-4 w-4" />
          <span>© {new Date().getFullYear()} Nectar-Pay · No keys. No fees.</span>
          <span className="hidden md:inline">·</span>
          <span>
            Part of the{" "}
            <a
              href="https://honest.money"
              className="underline-offset-4 hover:text-foreground hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Honest Money Ecosystem
            </a>
          </span>
        </div>
        <nav className="flex flex-wrap gap-4">
          <Link to="/where" className="hover:text-foreground">Find merchants</Link>
          <Link to="/manifesto" className="hover:text-foreground">Manifesto</Link>
          <Link to="/investors" className="hover:text-foreground">Investors</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>

        </nav>
      </div>
    </footer>
  );
}
