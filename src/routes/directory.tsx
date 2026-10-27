import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Clock, Globe, MapPin, Phone, Search, Store } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Input } from "@/components/ui/input";
import { getPublicDirectory } from "@/lib/directory.functions";
import type { DirectoryStore } from "@/lib/directory.server";
import { cn } from "@/lib/utils";

const directoryQuery = () =>
  queryOptions({ queryKey: ["public-directory"], queryFn: () => getPublicDirectory(), staleTime: 60_000 });

export const Route = createFileRoute("/directory")({
  head: () => ({
    meta: [
      { title: "Merchant Directory — Where to spend crypto · Nectar.Pay" },
      { name: "description", content: "The official directory of businesses that accept TEXITcoin, TSD, Bitcoin and stablecoins through Nectar.Pay." },
      { property: "og:title", content: "Nectar.Pay Merchant Directory" },
      { property: "og:description", content: "Find businesses that accept TSD, TXC, Bitcoin and stablecoins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://app.nectar-pay.com/directory" }],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(directoryQuery());
  },
  component: DirectoryPage,
});

function DirectoryPage() {
  const { data } = useSuspenseQuery(directoryQuery());
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [coin, setCoin] = useState<string | null>(null);

  const full = data.stores.filter((s) => s.listing !== "city_only");
  const pins = data.stores.filter((s) => s.listing === "city_only");
  const categories = useMemo(() => [...new Set(data.stores.map((s) => s.category).filter(Boolean))].sort() as string[], [data]);
  const coins = useMemo(() => {
    const pref = ["TSD", "TXC", "BTC", "USDC", "USDT"];
    const all = new Set(data.stores.flatMap((s) => s.accepts));
    return pref.filter((c) => all.has(c));
  }, [data]);

  const match = (s: DirectoryStore) => {
    if (cat && s.category !== cat) return false;
    if (coin && !s.accepts.includes(coin)) return false;
    if (!q) return true;
    const hay = [s.name, s.category, s.description, s.address.city, s.address.region, s.address.country].join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  };
  const shownFull = full.filter(match);
  const shownPins = pins.filter(match);
  const cities = Object.entries(
    shownPins.reduce<Record<string, number>>((acc, s) => {
      const k = [s.address.city, s.address.region].filter(Boolean).join(", ") || "Location not shared";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main className="mx-auto max-w-[90rem] px-4 py-12 md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Official merchant directory</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Where to spend crypto</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Every business that takes payments through Nectar.Pay. This is the source the Nectar-Pay website, CryptoPOP and other partners show.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat n={data.stores.length} label="Merchants" />
            <Stat n={full.length} label="Full listings" />
            <Stat n={new Set(data.stores.map((s) => s.address.city).filter(Boolean)).size} label="Cities" />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, city, category…" className="pl-9" />
          </div>
          <Chips items={categories} value={cat} onChange={setCat} allLabel="All categories" />
          <Chips items={coins} value={coin} onChange={setCoin} allLabel="Any coin" />
        </div>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Featured businesses <span className="text-muted-foreground">({shownFull.length})</span></h2>
          {shownFull.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No full listings match yet. Merchants can switch to “Full listing” under Stores → Your Store Info.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {shownFull.map((s) => <StoreCard key={s.id} s={s} />)}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="mb-1 text-lg font-semibold">More merchants <span className="text-muted-foreground">({shownPins.length})</span></h2>
          <p className="mb-4 text-sm text-muted-foreground">These businesses accept crypto but list only their city.</p>
          <div className="flex flex-wrap gap-2">
            {cities.map(([c, n]) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-sm">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {c} <span className="text-muted-foreground">· {n}</span>
              </span>
            ))}
          </div>
        </section>

        <div className="mt-12 rounded-xl border border-primary/30 bg-primary/5 p-6 text-sm">
          <div className="font-medium">Want to show this directory in your app or site?</div>
          <p className="mt-1 text-muted-foreground">
            It’s a free, open feed. See the <Link to="/api" className="text-primary underline">API page</Link> for details.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums">{n}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Chips({ items, value, onChange, allLabel }: { items: string[]; value: string | null; onChange: (v: string | null) => void; allLabel: string }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {[null, ...items].map((it) => (
        <button
          key={it ?? "all"}
          type="button"
          onClick={() => onChange(it)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            value === it ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:bg-accent",
          )}
        >
          {it ?? allLabel}
        </button>
      ))}
    </div>
  );
}

function StoreCard({ s }: { s: DirectoryStore }) {
  const addr = [s.address.street, s.address.city, s.address.region, s.address.postal_code].filter(Boolean).join(", ");
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card/60 p-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
          {s.logo_url ? <img src={s.logo_url} alt="" className="h-full w-full object-contain p-1" loading="lazy" /> : <Store className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold">{s.name}</div>
          <div className="truncate text-xs text-muted-foreground">{s.category ?? "Business"}{s.presence !== "physical" ? ` · ${s.presence === "online" ? "Online" : "In person & online"}` : ""}</div>
        </div>
      </div>
      {s.description && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>}
      <div className="mt-3 space-y-1 text-sm">
        {addr && <div className="flex gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span className="min-w-0">{addr}</span></div>}
        {s.phone && <div className="flex gap-2"><Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><a href={`tel:${s.phone}`} className="hover:underline">{s.phone}</a></div>}
        {s.hours && <div className="flex gap-2"><Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span className="min-w-0 whitespace-pre-line">{s.hours}</span></div>}
        {s.website && <div className="flex gap-2"><Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><a href={s.website} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{s.website.replace(/^https?:\/\//, "")}</a></div>}
      </div>
      <div className="mt-auto flex flex-wrap gap-1 pt-4">
        {s.accepts.map((c) => (
          <span key={c} className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">{c}</span>
        ))}
      </div>
    </div>
  );
}
