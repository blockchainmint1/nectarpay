import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Gift, Wallet, ArrowRight, Check } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/affiliates")({
  head: () => ({
    meta: [
      { title: "Affiliate program · Nectar.Pay" },
      {
        name: "description",
        content:
          "Refer a merchant to Nectar.Pay. When they pick up the $727 Merchant Start-up Kit, you pick your reward: a year of free processing, or $50 loaded into your wallet.",
      },
      { property: "og:title", content: "Refer a merchant, pick your reward · Nectar.Pay" },
      {
        property: "og:description",
        content:
          "One year of free processing, or $50 in your wallet — every time a merchant you refer buys the Start-up Kit.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://nectar-pay.com/affiliates" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/affiliates" }],
  }),
  component: AffiliatesPage,
});

function AffiliatesPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="np">
        <div className="mx-auto max-w-5xl px-6 pt-20 pb-14 text-center">
          <p
            className="np-mono text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--np-honey-400)" }}
          >
            Affiliate program
          </p>
          <h1 className="np-display mt-4 text-4xl md:text-6xl" style={{ letterSpacing: "-0.03em" }}>
            Refer a merchant.<br />
            <span style={{ color: "var(--np-honey-400)" }}>Pick your reward.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg" style={{ color: "var(--np-slate)" }}>
            Share your link. Every merchant you refer who picks up the{" "}
            <strong>$727 Merchant Start-up Kit</strong> earns you a reward — you choose which one.
            No caps. Open to anyone with a Nectar.Pay account.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/affiliate"
              className="np-btn np-btn-honey text-sm"
              style={{ padding: "12px 22px" }}
            >
              Get my link <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
            <Link
              to="/signup"
              className="np-btn np-btn-ghost text-sm"
              style={{ padding: "12px 22px" }}
            >
              Create an account
            </Link>
          </div>
        </div>
      </section>

      {/* Rewards */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="np-display text-2xl md:text-3xl" style={{ letterSpacing: "-0.02em" }}>
          Two rewards. Your call.
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--np-slate)" }}>
          Every qualifying referral, choose one:
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <RewardCard
            icon={<Gift className="h-5 w-5" />}
            title="A year of free processing"
            body="One full year on Nectar.Pay with zero processing fees for your own store. Worth well over the cash option once you get moving."
          />
          <RewardCard
            icon={<Wallet className="h-5 w-5" />}
            title="$50 loaded to your wallet"
            body="Cold, honest cash. Credited straight to your Nectar.Pay wallet the moment your referral's kit order is paid."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="np-display text-2xl md:text-3xl" style={{ letterSpacing: "-0.02em" }}>
          How it works
        </h2>
        <ol className="mt-8 space-y-6">
          <Step
            n={1}
            title="Grab your link"
            body={
              <>
                Sign in and head to{" "}
                <Link to="/affiliate" className="underline">
                  your affiliate dashboard
                </Link>
                . You get a personal tracking URL like{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  nectar-pay.com/?r=YOURCODE
                </code>
                .
              </>
            }
          />
          <Step
            n={2}
            title="Share it anywhere"
            body="X, Telegram, your newsletter, in-person at the coffee shop. Every click and signup is attributed to you (first-touch, 90 days)."
          />
          <Step
            n={3}
            title="Your referral buys the kit"
            body="When a merchant you referred purchases the $727 Merchant Start-up Kit from Blockchain Mint, the referral qualifies."
          />
          <Step
            n={4}
            title="Pick your reward"
            body="From your affiliate dashboard, choose a year of free processing or $50 cash. Rinse, repeat — no cap on how many rewards you can earn."
          />
        </ol>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="np-display text-2xl md:text-3xl" style={{ letterSpacing: "-0.02em" }}>
          Fine print
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Faq q="Who can join?" a="Anyone with a Nectar.Pay account. Your link is auto-generated the first time you visit your affiliate dashboard." />
          <Faq q="What counts as a qualifying referral?" a="A merchant you referred (first-touch, 90 days) purchases the $727 Merchant Start-up Kit from Blockchain Mint. That's the trigger." />
          <Faq q="Is there a cap?" a="No cap on the number of rewards. Refer ten merchants, earn ten rewards." />
          <Faq q="Do we have a separate program for mineTXC miners?" a="Yes — hash-power rewards to miners who refer merchants. And an IDMC Members program is coming shortly." />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-6 text-center">
        <div
          className="rounded-2xl px-8 py-14"
          style={{
            background: "linear-gradient(135deg, rgba(255,196,0,0.08), rgba(13,27,51,0.4))",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h3 className="np-display text-2xl md:text-3xl" style={{ letterSpacing: "-0.02em" }}>
            Ready to refer?
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm" style={{ color: "var(--np-slate)" }}>
            Grab your link from the dashboard in one click.
          </p>
          <Link
            to="/affiliate"
            className="np-btn np-btn-honey mt-6 inline-flex text-sm"
            style={{ padding: "12px 22px" }}
          >
            Open my affiliate dashboard <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function RewardCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ background: "rgba(255,196,0,0.14)", color: "var(--np-honey-400)" }}
      >
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm" style={{ color: "var(--np-slate)" }}>
        {body}
      </p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
        style={{ background: "rgba(255,196,0,0.14)", color: "var(--np-honey-400)" }}
      >
        {n}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm" style={{ color: "var(--np-slate)" }}>
          {body}
        </p>
      </div>
    </li>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h4 className="flex items-start gap-2 font-semibold">
        <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: "var(--np-honey-400)" }} /> {q}
      </h4>
      <p className="mt-2 text-sm" style={{ color: "var(--np-slate)" }}>
        {a}
      </p>
      <div className="sr-only">
        <Users />
      </div>
    </div>
  );
}
