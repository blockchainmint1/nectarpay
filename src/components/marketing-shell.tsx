import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The brand mark: a honeycomb cell with a slow honey drip.
 * Pure SVG so it stays crisp at any size and inherits currentColor.
 */
export function NectarMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 38"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <defs>
        <linearGradient id="nectar-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.88 0.16 88)" />
          <stop offset="100%" stopColor="oklch(0.66 0.20 60)" />
        </linearGradient>
      </defs>
      {/* Hex cell */}
      <path
        d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z"
        stroke="url(#nectar-grad)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Drip */}
      <path
        d="M13.6 29.4 Q16 38 18.4 29.4 Z"
        fill="url(#nectar-grad)"
      />
    </svg>
  );
}

export function NectarWordmark() {
  return (
    <span className="font-semibold tracking-tight">
      Nectar<span className="text-primary">.Pay</span>
    </span>
  );
}

export function MarketingNav() {
  const { user, loading } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <NectarMark className="h-6 w-6" />
          <NectarWordmark />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/docs" className="hover:text-foreground">Docs</Link>
          <Link to="/integrations" className="hover:text-foreground">Integrations</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {loading ? null : user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start free
                </Link>
              </Button>
            </>
          )}
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
          <span>© {new Date().getFullYear()} Nectar.Pay · No keys. No fees.</span>
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
          <Link to="/manifesto" className="hover:text-foreground">Manifesto</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/docs" className="hover:text-foreground">Docs</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
