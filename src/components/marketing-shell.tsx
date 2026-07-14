import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
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
import { ThemeToggle } from "@/components/theme-toggle";

/* ------------------------------------------------------------------ */
/* Brand marks                                                          */
/* ------------------------------------------------------------------ */

/** Hive mark — honey-gradient beehive dome, from the /brand system. */
export function HiveMark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 240 240" width={size} height={size} aria-hidden="true">
      <g transform="translate(0,15)" fill="var(--np-honey-400)">
        <path d="M198,171.2c-51.3-10-103.1-9.8-154.5-.8-5.1.9-9.4,2.8-11,8.1-1.3,4.3.3,8.9,3.2,12,2.9,2.9,7,4.7,11.9,3.8,47.7-8.1,95.3-8.4,143.7.1,8.2,0,14.1-5.6,14.2-13.3,0-3.9-3.1-9-7.5-9.9Z" />
        <path d="M216.3,136.8c-44.4-9.2-89.6-12.6-134.7-8.5l-8.9.8c-.3,0-.6,0-.8,0-16.7,2-33.3,3.6-49.9,7.7-6.5,1.6-9.4,8.3-8.1,14.5,1,4.6,6.7,10.9,13,9.9,21.3-3.6,42.1-6.7,63.6-7.8,40.9-2,78.6-.2,119.2,7.7,4.6.9,9.1-2.4,11.2-5,3-3.8,4-8.4,2-12.9-1-2.3-3.7-5.8-6.7-6.4Z" />
        <path d="M175.1,203.2c-37.5-6.3-75.2-6.4-112.7,0-4.4.8-7,5-5.1,9.7,2.1,5.2,9,11,15.5,10.2,30.9-4.1,61-5,92.4.3,7.5-.7,13.5-5,15.2-11.6,1.1-4.1-1.1-7.9-5.3-8.6Z" />
        <path d="M54.8,116.5c-13.5-6.5-24.8-11.6-35.3-20.2-5.4-1.5-10.8.4-14.7,4.1-3.6,3.3-5.5,8.3-4.6,13.5,1.3,7.3,8.1,12.3,15.4,10,12.9-3.9,25.6-5.1,39.2-7.4Z" />
        <path d="M24.4,74c16.8,14.5,36.6,24.7,58.2,30.3,46.3,11.9,95.2.8,130.9-30.8,4.2-3.7,2.8-10.4-.3-13.4-4.3-4-9.3-2.8-13.9,1-35.3,29.8-84.7,37.3-127,20.5-12.7-5-24-12.3-34.7-21-4.3-3.5-9.4-4.2-13.4-.5-3.6,3.3-4.4,10,.1,14Z" />
        <path d="M232.1,99.8c-2.9-2.2-9.4-6.1-13.3-3.4-11.6,8-22.9,14.6-36.2,20.2,14.6,1.8,26.9,3.7,40.4,7.4,7.6,2.1,13.8-3.5,14.6-10.7.6-5.6-1.3-10.4-5.5-13.6Z" />
        <path d="M48.1,43.3c40.9,34.5,100.5,34.8,141.3.1,4.1-3.5,5.4-9.1,1.6-13.7-3-3.5-8.8-4.2-13.4-.3-34.2,29-83.9,28.4-117.8-.4-4.2-3.5-10.2-2.8-13.2.6-3.9,4.6-2.5,10.1,1.6,13.6Z" />
        <path d="M77.4,17c25.7,17.3,58.7,17.7,83.7-.6,4.5-3.3,5.5-9.1,2.5-13-3.3-4.3-8.6-4.3-13.2-1-19.4,13.9-45.2,13-64.1-.7-4.4-3.2-10.4-1.5-12.7,2.5-2.9,5-.6,9.9,3.8,12.8Z" />
      </g>
    </svg>
  );
}

/** Legacy alias — some pages still import `NectarMark`. */
export function NectarMark({ className }: { className?: string }) {
  const px = className?.match(/h-(\d+)/)?.[1];
  const size = px ? parseInt(px, 10) * 4 : 24;
  return <HiveMark size={size} />;
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="np-display inline-flex items-center"
      style={{ fontSize: size, letterSpacing: "-0.03em", lineHeight: 1 }}
    >
      <span style={{ color: "var(--np-white)" }}>Nectar</span>
      <span style={{ color: "var(--np-honey-400)" }}>Pay</span>
    </span>
  );
}

/** Legacy alias. */
export function NectarWordmark() {
  return <Wordmark size={22} />;
}

/* ------------------------------------------------------------------ */
/* Nav                                                                  */
/* ------------------------------------------------------------------ */

const navLinks = [
  { to: "/price", label: "Price" },
  { to: "/fees", label: "Fees" },
  { to: "/integrate", label: "Integrate" },
  { to: "/investors", label: "Investors" },
] as const;


export function MarketingNav() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header
      className="np sticky top-0 z-40 backdrop-blur-md"
      style={{
        background: "rgba(13,27,51,0.75)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <HiveMark size={32} />
          <Wordmark size={20} />
        </Link>
        <nav
          className="hidden items-center gap-6 text-sm md:flex"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden sm:inline-flex" />
          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="np-btn np-btn-ghost text-sm"
                  style={{ padding: "10px 16px" }}
                >
                  <UserRound className="h-4 w-4" />
                  <span className="hidden max-w-[160px] truncate sm:inline">
                    {user.email}
                  </span>
                </button>
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
              <Link
                to="/auth"
                className="np-btn np-btn-ghost hidden text-sm sm:inline-flex"
                style={{ padding: "10px 16px" }}
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="np-btn np-btn-honey text-sm"
                style={{ padding: "10px 18px" }}
              >
                Start free
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="np-btn np-btn-ghost md:!hidden"
                style={{ padding: "10px 12px" }}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="np flex flex-col" style={{ background: "var(--np-navy)", color: "var(--np-white)", borderColor: "rgba(255,255,255,0.08)" }}>
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <nav className="mt-8 flex flex-col gap-4 text-base">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.to}>
                    <Link to={link.to} style={{ color: "rgba(255,255,255,0.75)" }}>
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-3 border-t pt-6" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                {loading ? null : user ? (
                  <>
                    <div className="truncate text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Signed in as <span style={{ color: "var(--np-white)" }}>{user.email}</span>
                    </div>
                    <SheetClose asChild>
                      <Link to="/dashboard" className="np-btn np-btn-honey text-sm">
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <button
                        className="np-btn np-btn-ghost text-sm"
                        onClick={async () => {
                          await signOut();
                          navigate({ to: "/" });
                        }}
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link to="/auth" className="np-btn np-btn-ghost text-sm">
                        Sign in
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/signup" className="np-btn np-btn-honey text-sm">
                        Start free
                      </Link>
                    </SheetClose>
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

/* ------------------------------------------------------------------ */
/* Footer                                                               */
/* ------------------------------------------------------------------ */

type FooterItem = { label: string; to?: string; href?: string; ext?: string };

function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <h4
        className="np-mono text-xs uppercase tracking-widest"
        style={{ color: "var(--np-honey-400)" }}
      >
        {title}
      </h4>
      <ul className="mt-4 space-y-3 text-sm">
        {items.map((it) => (
          <li key={it.label}>
            {it.to ? (
              <Link
                to={it.to}
                className="hover:text-white"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                {it.label}
              </Link>
            ) : it.ext ? (
              <a
                href={it.ext}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                {it.label} ↗
              </a>
            ) : (
              <a
                href={it.href}
                className="hover:text-white"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                {it.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingFooter() {
  return (
    <footer
      className="np"
      style={{
        background: "var(--np-navy)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <HiveMark size={36} />
              <Wordmark size={20} />
            </div>
            <p className="mt-4 text-sm" style={{ color: "var(--np-slate)" }}>
              The easiest, safest and smartest way to accept crypto payments.
            </p>
          </div>
          <FooterCol
            title="Product"
            items={[
              { label: "Where", to: "/where" },
              { label: "POS terminal", to: "/pos" },
              { label: "Compare", to: "/compare" },
              { label: "Pricing", to: "/pricing" },
              { label: "Demo", to: "/demo" },
            ]}
          />
          <FooterCol
            title="Developers"
            items={[
              { label: "Docs", to: "/docs" },
              { label: "Integrations", to: "/integrations" },
              { label: "TEXITcoin blockchain", ext: "https://texitcoin.org/build" },
            ]}
          />
          <FooterCol
            title="Company"
            items={[
              { label: "Manifesto", to: "/manifesto" },
              { label: "Investors", to: "/investors" },
              { label: "Affiliates", to: "/affiliates" },
              { label: "Contact", to: "/contact" },
              { label: "Brand", to: "/brand" },
            ]}
          />


        </div>

        <div
          className="mt-12 flex flex-col items-start justify-between gap-4 border-t pt-8 md:flex-row md:items-center"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <p className="np-mono text-xs" style={{ color: "var(--np-slate)" }}>
            PART OF THE{" "}
            <a
              href="https://honest.money"
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--np-honey-400)" }}
            >
              HONEST.MONEY
            </a>{" "}
            ECOSYSTEM
          </p>
          <p className="np-mono text-xs" style={{ color: "var(--np-slate)" }}>
            © {new Date().getFullYear()} NECTARPAY · V1.0 ·{" "}
            <Link to="/terms" className="hover:text-white" style={{ color: "var(--np-slate)" }}>
              TERMS
            </Link>{" "}
            ·{" "}
            <Link to="/privacy" className="hover:text-white" style={{ color: "var(--np-slate)" }}>
              PRIVACY
            </Link>
          </p>

        </div>
      </div>
    </footer>
  );
}
