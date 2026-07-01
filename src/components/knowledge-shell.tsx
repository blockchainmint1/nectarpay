import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

type NavItem = { to: string; label: string };
type NavGroup = { title: string; items: NavItem[] };

const BASE = "/admin/knowledge";

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { to: `${BASE}`, label: "Home" },
      { to: `${BASE}/convenience-doctrine`, label: "Convenience Doctrine" },
      { to: `${BASE}/executive-summary`, label: "Executive Summary" },
    ],
  },
  {
    title: "Pitch Decks",
    items: [
      { to: `${BASE}/pitch/new-markets`, label: "New Markets (Franchise)" },
      { to: `${BASE}/pitch/merchants`, label: "Merchants → Nectar-PAY" },
      { to: `${BASE}/pitch/consumers`, label: "Consumers → CryptoPOP" },
    ],
  },
  {
    title: "Training Manuals",
    items: [
      { to: `${BASE}/training/cryptopop`, label: "CryptoPOP Participants" },
      { to: `${BASE}/training/merchant-onboarding`, label: "Merchant Onboarding" },
      { to: `${BASE}/training/sales-reps`, label: "Sales Rep Field Manual" },
    ],
  },
  {
    title: "Ecosystem",
    items: [
      { to: `${BASE}/manifesto`, label: "Manifesto" },
      { to: `${BASE}/terms`, label: "Terms" },
      { to: `${BASE}/privacy`, label: "Privacy" },
    ],
  },
];

export function KnowledgeShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="knowledge-scope -mx-6 -my-8 min-h-[calc(100vh-4rem)] rounded-none">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-border bg-[color:var(--ink)] text-white lg:flex">
          <SidebarInner pathname={pathname} onNav={() => {}} />
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center gap-2">
              <div className="honey-gradient flex h-8 w-8 items-center justify-center rounded-md font-display font-bold text-[color:var(--ink)]">
                N
              </div>
              <span className="font-display font-semibold text-[color:var(--ink)]">Knowledge</span>
            </div>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-md border border-border p-1.5 text-[color:var(--ink)]"
              aria-label="Toggle nav"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          {mobileOpen ? (
            <div className="border-b border-border bg-[color:var(--ink)] text-white lg:hidden">
              <SidebarInner pathname={pathname} onNav={() => setMobileOpen(false)} compact />
            </div>
          ) : null}

          <Outlet />
          <KnowledgeFooter />
        </main>
      </div>
    </div>
  );
}

function SidebarInner({
  pathname,
  onNav,
  compact = false,
}: {
  pathname: string;
  onNav: () => void;
  compact?: boolean;
}) {
  return (
    <>
      {!compact ? (
        <div className="px-6 pt-7 pb-6">
          <Link to={BASE as string} className="flex items-center gap-2.5">
            <div className="honey-gradient flex h-9 w-9 items-center justify-center rounded-lg font-display text-lg font-bold text-[color:var(--ink)]">
              N
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg font-semibold">Nectar-PAY</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                Knowledge · Field Manual
              </span>
            </div>
          </Link>
          <Link
            to="/admin"
            className="mt-4 inline-block text-[11px] uppercase tracking-[0.2em] text-white/50 hover:text-white"
          >
            ← Back to Admin
          </Link>
        </div>
      ) : null}

      <nav className={`flex-1 overflow-y-auto px-3 pb-8 ${compact ? "pt-4" : ""}`}>
        {NAV.map((group) => (
          <div key={group.title} className="mb-6">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
              {group.title}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.to;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to as string}
                      onClick={onNav}
                      className={
                        "block rounded-md px-3 py-2 text-sm transition-colors " +
                        (active
                          ? "bg-[color:var(--honey)] font-medium text-[color:var(--ink)]"
                          : "text-white/75 hover:bg-white/5 hover:text-white")
                      }
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!compact ? (
        <div className="border-t border-white/10 px-6 py-4 text-[11px] text-white/40">
          v1.0 · Internal · Confidential
        </div>
      ) : null}
    </>
  );
}

function KnowledgeFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-[color:var(--ink)] text-white/70">
      <div className="mx-auto max-w-4xl px-8 py-10">
        <div className="flex items-center gap-2.5">
          <div className="honey-gradient flex h-8 w-8 items-center justify-center rounded-md font-display font-bold text-[color:var(--ink)]">
            N
          </div>
          <span className="font-display text-base font-semibold text-white">
            Nectar-PAY · Knowledge
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed">
          Internal team resource. For admins, ambassadors, and regional partners.
        </p>
        <div className="mt-6 border-t border-white/10 pt-4 text-xs text-white/40">
          © {new Date().getFullYear()} Nectar-PAY. Confidential.
        </div>
      </div>
    </footer>
  );
}

export function DocHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <header className="border-b border-border bg-comb/40">
      <div className="mx-auto max-w-3xl px-8 py-14">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-honey-deep">
          {eyebrow}
        </div>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.1] text-ink md:text-5xl">
          {title}
        </h1>
        {lede ? (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{lede}</p>
        ) : null}
      </div>
    </header>
  );
}

export function DocBody({ children }: { children: ReactNode }) {
  return (
    <article className="doc-prose mx-auto max-w-3xl px-8 py-14">
      {children}
    </article>
  );
}

export function Slide({
  n,
  kicker,
  title,
  children,
  tone = "light",
}: {
  n: number;
  kicker: string;
  title: string;
  children: ReactNode;
  tone?: "light" | "dark" | "honey";
}) {
  const styles =
    tone === "dark"
      ? "bg-ink text-white"
      : tone === "honey"
      ? "honey-gradient text-ink"
      : "bg-card text-ink";
  const kickerColor =
    tone === "light" ? "text-honey-deep" : tone === "honey" ? "text-ink/70" : "text-honey";
  const subColor =
    tone === "light"
      ? "text-muted-foreground"
      : tone === "honey"
      ? "text-ink/80"
      : "text-white/70";

  return (
    <section className={`mb-6 overflow-hidden rounded-2xl border border-border ${styles}`}>
      <div className="px-8 py-10 md:px-12 md:py-14">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.22em]">
          <span className={kickerColor}>{kicker}</span>
          <span className={subColor}>Slide {String(n).padStart(2, "0")}</span>
        </div>
        <h2 className="mt-4 font-display text-3xl font-semibold leading-tight md:text-4xl">
          {title}
        </h2>
        <div className={`mt-6 leading-relaxed ${tone === "light" ? "" : subColor}`}>
          {children}
        </div>
      </div>
    </section>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 px-5 py-4">
      <div className="font-display text-3xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
