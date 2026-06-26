import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The brand mark: a friendly, modern honeybee.
 * Pure SVG so it stays crisp at any size. Honey-gold body, dark stripes,
 * translucent wings. Designed to read at 16px favicon as well as 96px hero.
 */
export function NectarMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <defs>
        <linearGradient id="nectar-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.90 0.17 88)" />
          <stop offset="100%" stopColor="oklch(0.68 0.19 62)" />
        </linearGradient>
        <linearGradient id="nectar-wing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.98 0.02 80)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="oklch(0.85 0.10 80)" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* Antennae */}
      <path
        d="M17 8 Q15 4 13 3"
        stroke="oklch(0.22 0.03 60)"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M23 8 Q25 4 27 3"
        stroke="oklch(0.22 0.03 60)"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12.6" cy="2.8" r="1.1" fill="oklch(0.22 0.03 60)" />
      <circle cx="27.4" cy="2.8" r="1.1" fill="oklch(0.22 0.03 60)" />

      {/* Wings (behind body) */}
      <ellipse
        cx="11.5"
        cy="14"
        rx="7"
        ry="9"
        fill="url(#nectar-wing)"
        stroke="oklch(0.80 0.17 78 / 0.5)"
        strokeWidth="0.8"
        transform="rotate(-22 11.5 14)"
      />
      <ellipse
        cx="28.5"
        cy="14"
        rx="7"
        ry="9"
        fill="url(#nectar-wing)"
        stroke="oklch(0.80 0.17 78 / 0.5)"
        strokeWidth="0.8"
        transform="rotate(22 28.5 14)"
      />

      {/* Body */}
      <ellipse
        cx="20"
        cy="22"
        rx="10"
        ry="12"
        fill="url(#nectar-body)"
        stroke="oklch(0.22 0.03 60)"
        strokeWidth="1.2"
      />

      {/* Stripes */}
      <path
        d="M12.4 18 Q20 16 27.6 18"
        stroke="oklch(0.22 0.03 60)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M11.2 24 Q20 22.4 28.8 24"
        stroke="oklch(0.22 0.03 60)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M13 30 Q20 29 27 30"
        stroke="oklch(0.22 0.03 60)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Stinger */}
      <path
        d="M18.6 33.6 L20 37 L21.4 33.6 Z"
        fill="oklch(0.22 0.03 60)"
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
          <Link to="/where" className="hover:text-foreground">Where to spend</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/docs" className="hover:text-foreground">Docs</Link>
          <Link to="/integrations" className="hover:text-foreground">Integrations</Link>
          <a
            href="https://beekeeper.honest.money"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            Wallet
          </a>
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
                <Link to="/signup">Start free</Link>
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
          <Link to="/where" className="hover:text-foreground">Find merchants</Link>
          <Link to="/manifesto" className="hover:text-foreground">Manifesto</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
