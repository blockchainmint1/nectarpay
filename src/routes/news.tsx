import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News — NectarPay" },
      {
        name: "description",
        content:
          "Latest updates from the NectarPay team — shipping milestones, terminal rollouts, and ecosystem news.",
      },
      { property: "og:title", content: "News — NectarPay" },
      {
        property: "og:description",
        content:
          "Latest updates from the NectarPay team — shipping milestones, terminal rollouts, and ecosystem news.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/news" }],
  }),
  component: NewsPage,
});

type NewsItem = {
  date: string; // ISO
  displayDate: string;
  tag: string;
  title: string;
  body: React.ReactNode;
};

const items: NewsItem[] = [
  {
    date: "2026-07-13",
    displayDate: "13 Jul 2026",
    tag: "Supply chain",
    title: "PO issued for 10,000 additional terminals — bound for DFW",
    body: (
      <>
        We've placed a purchase order for an additional{" "}
        <strong>10,000 NectarPay terminals</strong>, destined for the{" "}
        <strong>Dallas–Fort Worth</strong> marketplace. DFW keeps asking, and
        we keep answering. If you're a merchant in North Texas and want to be
        first in line,{" "}
        <Link to="/demo" style={{ color: "var(--np-honey-400)" }}>
          book a demo
        </Link>
        .
      </>
    ),
  },
  {
    date: "2026-06-30",
    displayDate: "30 Jun 2026",
    tag: "Supply chain",
    title: "PO issued for the first 1,200 terminals",
    body: (
      <>
        The very first production run is in motion — <strong>1,200
        terminals</strong> on the line, headed to early merchants and pilot
        markets. This is the batch that turns "coming soon" into "in your
        hand."
      </>
    ),
  },
];

function NewsPage() {
  return (
    <div
      className="np min-h-screen"
      style={{ background: "var(--np-navy)", color: "var(--np-white)" }}
    >
      <MarketingNav />

      <main className="mx-auto max-w-4xl px-6 py-20">
        <div className="mb-14">
          <p
            className="np-mono text-xs uppercase tracking-widest"
            style={{ color: "var(--np-honey-400)" }}
          >
            News
          </p>
          <h1
            className="np-display mt-3 text-5xl md:text-6xl"
            style={{ letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            What the hive is up to.
          </h1>
          <p
            className="mt-5 max-w-2xl text-lg"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Shipping milestones, terminal rollouts, and the occasional victory
            lap. No fluff — just the receipts.
          </p>
        </div>

        <ol className="space-y-8">
          {items.map((item) => (
            <li
              key={item.date + item.title}
              className="rounded-2xl p-8"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <time
                  dateTime={item.date}
                  className="np-mono text-xs uppercase tracking-widest"
                  style={{ color: "var(--np-honey-400)" }}
                >
                  {item.displayDate}
                </time>
                <span
                  className="np-mono text-[10px] uppercase tracking-widest rounded-full px-2 py-1"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {item.tag}
                </span>
              </div>
              <h2
                className="np-display mt-3 text-2xl md:text-3xl"
                style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
              >
                {item.title}
              </h2>
              <p
                className="mt-3 text-base leading-relaxed"
                style={{ color: "rgba(255,255,255,0.78)" }}
              >
                {item.body}
              </p>
            </li>
          ))}
        </ol>

        <div
          className="mt-16 rounded-2xl p-8 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(245,180,50,0.10), rgba(245,180,50,0.02))",
            border: "1px solid rgba(245,180,50,0.25)",
          }}
        >
          <h3
            className="np-display text-2xl"
            style={{ letterSpacing: "-0.02em" }}
          >
            Want to be in the next update?
          </h3>
          <p
            className="mt-2 text-sm"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Get a terminal in your hands and join the merchants making the news.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/demo" className="np-btn np-btn-honey text-sm">
              Book a demo
            </Link>
            <Link to="/signup" className="np-btn np-btn-ghost text-sm">
              Start free
            </Link>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
