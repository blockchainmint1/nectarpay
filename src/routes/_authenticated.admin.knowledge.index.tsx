import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/knowledge/")({
  head: () => ({
    meta: [
      { title: "Knowledge · Nectar-PAY" },
      {
        name: "description",
        content:
          "Internal pitch decks, executive summary, and training manuals for the Nectar-PAY & CryptoPOP teams.",
      },
    ],
  }),
  component: Home,
});

const CARDS: Array<{ to: string; eyebrow: string; title: string; desc: string }> = [
  {
    to: "/admin/knowledge/convenience-doctrine",
    eyebrow: "Read First",
    title: "The Convenience Doctrine",
    desc:
      "The single bar we have to clear — or none of this works. Read before everything else.",
  },
  {
    to: "/admin/knowledge/executive-summary",
    eyebrow: "Strategy",
    title: "Executive Summary",
    desc: "Where we are, where we're going, and why this is the moment.",
  },
  {
    to: "/admin/knowledge/pitch/new-markets",
    eyebrow: "Pitch · Franchise",
    title: "New Markets Deck",
    desc: "Recruit regional partners to launch Nectar-PAY & CryptoPOP in their territory.",
  },
  {
    to: "/admin/knowledge/pitch/merchants",
    eyebrow: "Pitch · Merchants",
    title: "Nectar-PAY for Merchants",
    desc: "The merchant-facing deck. Lower fees, instant settlement, new traffic.",
  },
  {
    to: "/admin/knowledge/pitch/consumers",
    eyebrow: "Pitch · Consumers",
    title: "CryptoPOP for Consumers",
    desc: "Why people show up, earn POP, and bring their friends.",
  },
  {
    to: "/admin/knowledge/training/cryptopop",
    eyebrow: "Training",
    title: "CryptoPOP Participants",
    desc: "Earn POP, invite merchants, climb the leaderboard.",
  },
  {
    to: "/admin/knowledge/training/merchant-onboarding",
    eyebrow: "Training",
    title: "Merchant Onboarding",
    desc: "Eight steps from yes to first crypto transaction.",
  },
  {
    to: "/admin/knowledge/training/sales-reps",
    eyebrow: "Training",
    title: "Sales Rep Manual",
    desc: "Conversations, objections, pricing, portfolio.",
  },
];

function Home() {
  return (
    <div>
      <section className="border-b border-border bg-comb/40">
        <div className="mx-auto max-w-5xl px-8 py-16 md:py-24">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-honey-deep">
            Internal · Confidential
          </div>
          <h1 className="mt-3 max-w-3xl font-display text-5xl font-semibold leading-[1.05] text-ink md:text-6xl">
            Everything the Nectar-PAY team needs, in one hive.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Pitch decks for partners, merchants, and consumers — plus the training manuals that
            turn ambassadors into a localized sales force. Read it, share it, keep it close.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/admin/knowledge/executive-summary"
              className="inline-flex items-center rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Start with the summary
            </Link>
            <Link
              to="/admin/knowledge/training/sales-reps"
              className="inline-flex items-center rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium text-ink hover:bg-comb/60"
            >
              Open sales manual
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-8 py-14">
        <div className="grid gap-4 md:grid-cols-2">
          {CARDS.map((c) => (
            <Link
              key={c.to}
              to={c.to as string}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-honey hover:shadow-[0_8px_28px_-12px_rgba(180,120,40,0.25)]"
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-honey-deep">
                {c.eyebrow}
              </div>
              <div className="mt-2 font-display text-xl font-semibold text-ink">{c.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              <div className="mt-4 text-sm font-medium text-honey-deep opacity-0 transition-opacity group-hover:opacity-100">
                Open →
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
