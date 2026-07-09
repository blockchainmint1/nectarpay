import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { getLiveStats, type LiveStats } from "@/lib/live-stats.functions";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Stats — NectarPay" },
      {
        name: "description",
        content:
          "Real-time NectarPay network stats. Merchants, terminals, transactions, savings — updated live from the database, never from a slide deck.",
      },
      { property: "og:title", content: "NectarPay Live — real-time payment stats" },
      {
        property: "og:description",
        content:
          "Every number on this page is streamed live from the NectarPay network. Nothing is stale, nothing is cherry-picked.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LivePage,
});

const fmt = new Intl.NumberFormat("en-US");
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 100 ? 0 : 2,
  }).format(n);

function useCountUp(target: number, ms = 700) {
  const [v, setV] = useState(target);
  useEffect(() => {
    const start = performance.now();
    const from = v;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return v;
}

function Stat({
  value,
  label,
  sub,
  accent = false,
  format = "number",
}: {
  value: number;
  label: string;
  sub?: string;
  accent?: boolean;
  format?: "number" | "money";
}) {
  const v = useCountUp(value);
  const display =
    format === "money" ? money(v) : fmt.format(Math.round(v));
  return (
    <div
      className="np relative overflow-hidden rounded-2xl p-6 md:p-8"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          background: accent
            ? "radial-gradient(600px 200px at 100% 0%, rgba(255,193,7,0.25), transparent 60%)"
            : "radial-gradient(600px 200px at 100% 0%, rgba(56,189,248,0.18), transparent 60%)",
        }}
      />
      <div className="relative">
        <div
          className="np-display"
          style={{
            fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: accent ? "var(--np-honey-400)" : "var(--np-white)",
          }}
        >
          {display}
        </div>
        <div
          className="mt-3 text-sm md:text-base"
          style={{ color: "var(--np-white)" }}
        >
          {label}
        </div>
        {sub && (
          <div
            className="np-mono mt-2 text-xs"
            style={{ color: "var(--np-slate)" }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function LivePulse() {
  return (
    <span className="np-mono inline-flex items-center gap-2 text-xs" style={{ color: "var(--np-honey-400)" }}>
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{
          background: "var(--np-honey-400)",
          boxShadow: "0 0 0 0 var(--np-honey-400)",
          animation: "np-pulse 1.6s ease-out infinite",
        }}
      />
      LIVE · UPDATES EVERY 30s
    </span>
  );
}

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function shortHash(h: string): string {
  return h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h;
}

function explorerUrl(chain: string | null, hash: string): string {
  switch ((chain ?? "").toLowerCase()) {
    case "btc":
      return `https://mempool.space/tx/${hash}`;
    case "eth":
    case "base":
      return `https://etherscan.io/tx/${hash}`;
    case "txc":
      return `https://mempool.texitcoin.org/tx/${hash}`;
    case "tron":
      return `https://tronscan.org/#/transaction/${hash}`;
    case "sol":
      return `https://solscan.io/tx/${hash}`;
    case "doge":
      return `https://blockchair.com/dogecoin/transaction/${hash}`;
    default:
      return `https://www.google.com/search?q=${hash}`;
  }
}

const FUN_THINGS = [
  { usd: 15, thing: "a family pizza" },
  { usd: 40, thing: "a tank of gas" },
  { usd: 80, thing: "date night" },
  { usd: 150, thing: "a week of groceries" },
  { usd: 400, thing: "a new tool for the shop" },
  { usd: 1200, thing: "a month's rent" },
  { usd: 5000, thing: "a used truck" },
];

function funThingFor(usd: number): string {
  const match = [...FUN_THINGS].reverse().find((t) => usd >= t.usd);
  return match ? match.thing : "a good cup of coffee";
}

function LivePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["live-stats"],
    queryFn: () => getLiveStats(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="np min-h-screen" style={{ background: "var(--np-navy)" }}>
      <style>{`
        @keyframes np-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,193,7,0.6); }
          70% { box-shadow: 0 0 0 10px rgba(255,193,7,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,193,7,0); }
        }
        @keyframes np-slide-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <MarketingNav />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-12 md:pt-20">
        {/* Hero */}
        <section className="mb-12 md:mb-16">
          <LivePulse />
          <h1
            className="np-display mt-4"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: "var(--np-white)",
            }}
          >
            The whole network,{" "}
            <span style={{ color: "var(--np-honey-400)" }}>right now.</span>
          </h1>
          <p
            className="mt-5 max-w-2xl text-lg"
            style={{ color: "var(--np-slate)" }}
          >
            Every number on this page is streamed live from the NectarPay
            database. No screenshots. No stale slide-deck stats. If it happened
            in the last thirty seconds, it's here.
          </p>
        </section>

        {isLoading || !data ? (
          <SkeletonGrid />
        ) : (
          <LiveContent data={data} />
        )}
      </main>

      <MarketingFooter />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-40 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        />
      ))}
    </div>
  );
}

function LiveContent({ data }: { data: LiveStats }) {
  const funThing = useMemo(
    () => funThingFor(data.savings.total_usd),
    [data.savings.total_usd],
  );

  return (
    <>
      {/* Headline stats */}
      <section className="grid gap-4 md:grid-cols-3">
        <Stat
          value={data.transactions.total}
          label="Transactions processed"
          sub={`${fmt.format(data.transactions.last_30d)} in the last 30 days`}
          accent
        />
        <Stat
          value={data.transactions.volume_usd_all_time}
          label="Total volume settled"
          sub={`${money(data.transactions.volume_usd_30d)} in the last 30 days`}
          format="money"
        />
        <Stat
          value={data.savings.total_usd}
          label="Merchant savings vs. 2.9% cards"
          sub={`Enough for ${funThing} · avg ${money(data.savings.per_merchant_avg_usd)}/merchant`}
          accent
          format="money"
        />
      </section>

      {/* Merchants + terminals */}
      <section className="mt-4 grid gap-4 md:grid-cols-4">
        <Stat
          value={data.merchants.total}
          label="Merchants, all time"
          sub={`${data.merchants.active_30d} active · ${data.merchants.new_30d} new (30d)`}
        />
        <Stat
          value={data.terminals.total}
          label="Physical terminals"
          sub={`${data.terminals.online_24h} online in last 24h`}
        />
        <Stat
          value={data.handhelds.total}
          label="Handheld devices"
          sub="Tap-to-pay ready"
        />
        <Stat
          value={data.terminals.countries}
          label="Countries with active terminals"
        />
      </section>

      {/* Recent transactions ticker */}
      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2
              className="np-display"
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                letterSpacing: "-0.02em",
                color: "var(--np-white)",
              }}
            >
              Last 10 transactions
            </h2>
            <p className="np-mono mt-1 text-xs" style={{ color: "var(--np-slate)" }}>
              STREAMING · UPDATED {timeAgo(data.generated_at).toUpperCase()}
            </p>
          </div>
          <LivePulse />
        </div>
        <div
          className="overflow-hidden rounded-2xl"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <table className="w-full text-left text-sm">
            <thead
              className="np-mono text-xs uppercase"
              style={{ color: "var(--np-slate)", background: "rgba(255,255,255,0.03)" }}
            >
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Chain</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Where</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center" style={{ color: "var(--np-slate)" }}>
                    No confirmed transactions yet — you could be the first.
                  </td>
                </tr>
              )}
              {data.transactions.recent.map((t) => (
                <tr
                  key={t.id}
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    color: "var(--np-white)",
                    animation: "np-slide-in 0.4s ease-out",
                  }}
                >
                  <td className="np-mono px-4 py-3 text-xs" style={{ color: "var(--np-slate)" }}>
                    {timeAgo(t.created_at)}
                  </td>
                  <td className="px-4 py-3 uppercase">{t.chain ?? "—"}</td>
                  <td className="np-mono px-4 py-3 text-xs">
                    {t.token ?? t.chain?.toUpperCase() ?? "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--np-slate)" }}>
                    <div>{t.country ?? "—"}</div>
                    {t.tx_hash && (
                      <a
                        href={explorerUrl(t.chain, t.tx_hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="np-mono text-[10px] hover:underline"
                        style={{ color: "var(--np-honey-400)" }}
                        title={t.tx_hash}
                      >
                        {shortHash(t.tx_hash)}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {money(t.fiat_amount)}{" "}
                    <span className="np-mono text-xs" style={{ color: "var(--np-slate)" }}>
                      {t.fiat_currency}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rewards */}
      <section className="mt-12 grid gap-4 md:grid-cols-3">
        <Stat
          value={data.rewards.total_txc}
          label="TEXITcoin rewards distributed"
          sub={`≈ ${money(data.rewards.total_usd)} to ${fmt.format(data.rewards.recipients)} recipients`}
          accent
        />
        <Stat
          value={data.rewards.recipients}
          label="Reward recipients"
        />
        <Stat
          value={data.network.members_geo_total}
          label="Ecosystem members mapped"
          sub="TEXITcoin community geo-index"
        />
      </section>

      {/* Settlement breakdown */}
      <section className="mt-12 grid gap-6 md:grid-cols-3">
        <Panel title="Settlement chain">
          <BreakdownList
            rows={data.settlement.by_chain.map((r) => ({
              label: r.chain.toUpperCase(),
              value: r.count,
              sub: money(r.volume_usd),
            }))}
          />
        </Panel>
        <Panel title="Settlement asset">
          <BreakdownList
            rows={data.settlement.by_token.map((r) => ({
              label: r.token,
              value: r.count,
            }))}
          />
        </Panel>
        <Panel title="Settlement currency">
          <BreakdownList
            rows={data.settlement.by_currency.map((r) => ({
              label: r.currency,
              value: r.count,
              sub: money(r.volume),
            }))}
          />
        </Panel>
      </section>

      {/* Country + states */}
      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <Panel title="Transactions by country">
          {data.by_country.length === 0 ? (
            <Empty>No terminal-geo data yet.</Empty>
          ) : (
            <BreakdownList
              rows={data.by_country.map((r) => ({
                label: r.country,
                value: r.count,
                sub: money(r.volume_usd),
              }))}
            />
          )}
        </Panel>
        <Panel title="Top US states — TEXITcoin community">
          <BreakdownList
            rows={data.network.top_states.map((r) => ({
              label: r.state,
              value: r.count,
            }))}
          />
        </Panel>
      </section>

      <footer className="mt-16 text-center">
        <p className="np-mono text-xs" style={{ color: "var(--np-slate)" }}>
          GENERATED {new Date(data.generated_at).toISOString()} · SERVED FROM
          LIVE DATABASE · NO CACHE
        </p>
      </footer>
    </>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <h3
        className="np-mono mb-4 text-xs uppercase"
        style={{ color: "var(--np-slate)", letterSpacing: "0.1em" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function BreakdownList({
  rows,
}: {
  rows: Array<{ label: string; value: number; sub?: string }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <Empty>No data yet.</Empty>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between">
            <span style={{ color: "var(--np-white)" }}>{r.label}</span>
            <span className="np-mono text-xs" style={{ color: "var(--np-slate)" }}>
              {fmt.format(r.value)}
              {r.sub ? ` · ${r.sub}` : ""}
            </span>
          </div>
          <div
            className="mt-1 h-1.5 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              style={{
                width: `${(r.value / max) * 100}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, var(--np-honey-400), rgba(255,193,7,0.4))",
                transition: "width 600ms ease-out",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm" style={{ color: "var(--np-slate)" }}>
      {children}
    </p>
  );
}
