import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function MarketingNav() {
  const { user, loading } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary glow" />
          <span>
            TEXIT<span className="text-primary">coin</span> Pay
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/docs" className="hover:text-foreground">Docs</Link>
          <Link to="/integrations/woocommerce" className="hover:text-foreground">WooCommerce</Link>
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
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-sm bg-primary" />
          <span>© {new Date().getFullYear()} TEXITcoin Pay. Non-custodial by design.</span>
        </div>
        <nav className="flex flex-wrap gap-6">
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/docs" className="hover:text-foreground">Docs</Link>
          <Link to="/integrations/woocommerce" className="hover:text-foreground">WooCommerce</Link>
          <Link to="/auth" className="hover:text-foreground">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
