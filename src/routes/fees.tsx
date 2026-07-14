import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Zap, Wifi, Smartphone, Printer, Fuel, Sparkles, AlertTriangle, PiggyBank } from "lucide-react";

export const Route = createFileRoute("/fees")({
  head: () => ({
    meta: [
      { title: "Fees — Nothing in Life is Free · Nectar.Pay" },
      {
        name: "description",
        content:
          "The no-nonsense conversation about what it actually costs to accept crypto payments with Nectar.Pay. Hardware, service, and network Gas — laid bare.",
      },
      { property: "og:title", content: "Fees — Nothing in Life is Free" },
      {
        property: "og:description",
        content:
          "You hear 'free' all the time. There's always a hidden cost. Here's ours, in plain English.",
      },
      { property: "og:url", content: "https://nectar-pay.com/fees" },
    ],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/fees" }],
  }),
  component: FeesPage,
});

function FeesPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 comb-bg opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
          <p className="np-eyebrow-chip mx-auto mb-6">A Real Talk</p>
          <h1 className="np-display text-5xl leading-[0.95] sm:text-7xl">
            Nothing in life
            <br />
            is <span className="honey-text">free.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            You hear "free" thrown around like confetti. There's always a hidden
            cost tucked in the fine print — a data grab, a delay, a spread, a
            "convenience" fee, a soul. This page is the no-nonsense
            conversation about what it actually costs to participate in
            Nectar<span className="text-primary">-Pay</span>.
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Spoiler: the costs are <strong className="text-foreground">extremely low</strong>.
            But not zero. Even the time you spend learning how to accept a
            payment has a cost. We're going to respect you enough to say so.
          </p>
          <div className="mx-auto mt-10 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-mono uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Besides the fees on this page, none come from us
          </div>
        </div>
      </section>

      {/* WHAT WE CHARGE */}
      <section className="border-b border-border/60 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <p className="np-eyebrow">Part One</p>
            <h2 className="np-display mt-3 text-4xl sm:text-5xl">The stuff we charge for.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Two line items. That's it. Hardware and a service plan.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Terminal card */}
            <div className="np-card-navy relative overflow-hidden p-8">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/15 p-2 text-primary">
                    <Printer className="h-5 w-5" />
                  </div>
                  <p className="font-mono text-xs uppercase tracking-widest text-primary">Hardware</p>
                </div>
                <h3 className="np-h mt-4 text-2xl">Nectar.Pay Terminal</h3>
                <p className="mt-1 font-mono text-4xl font-bold text-foreground">
                  $499<span className="text-base font-normal text-muted-foreground"> · one time</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm leading-relaxed text-foreground/80">
                  <li className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>Uses the built-in receipt printer? You'll need thermal paper now and then. Cheap. From anywhere.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>One-year warranty. If it fails without provocation, we replace it. Full stop.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>Beat the heck out of it and it breaks? <em>You break it, you buy it (again).</em> Fair's fair.</span>
                  </li>
                  <li className="flex gap-3">
                    <Wifi className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>Needs a Wi-Fi connection — you provide it, we don't.</span>
                  </li>
                  <li className="flex gap-3">
                    <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>Has a SIM slot for mobile use — also on you.</span>
                  </li>
                </ul>
                <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                  <strong className="text-primary">Don't want the terminal?</strong>{" "}
                  <span className="text-foreground/80">
                    Run the Nectar.Pay POS app on your phone. No hardware required — you just skip the receipt printer and rugged handheld.
                  </span>
                </div>
              </div>
            </div>

            {/* Service card */}
            <div className="np-card-navy relative overflow-hidden p-8">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/15 p-2 text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <p className="font-mono text-xs uppercase tracking-widest text-primary">Service</p>
                </div>
                <h3 className="np-h mt-4 text-2xl">Nectar.Pay Membership</h3>
                <p className="mt-1 font-mono text-4xl font-bold text-foreground">
                  $19<span className="text-base font-normal text-muted-foreground"> /mo · paid annually</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm leading-relaxed text-foreground/80">
                  <li className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    Standard plan is <strong className="text-foreground">$19/month</strong>, paid up front for the year.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    Want <strong className="text-foreground">white-glove support?</strong> Bump it to <span className="font-mono">$99/mo</span>. We'll pick up the phone.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    There is a <strong className="text-foreground">free tier</strong> — but you can't use it with the POS terminal hardware. Software-only.
                  </li>
                </ul>
                <div className="mt-6 rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                  See the full plan grid on the{" "}
                  <Link to="/price" className="text-primary underline-offset-4 hover:underline">
                    /price
                  </Link>{" "}
                  page.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CRYPTO / GAS */}
      <section className="border-b border-border/60 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <p className="np-eyebrow">Part Two</p>
            <h2 className="np-display mt-3 text-4xl sm:text-5xl">
              Crypto fees — <span className="honey-text">this is where it gets interesting.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              These fees don't go to us. They go to the networks that carry your money. That's how crypto works.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="np-card-navy p-8">
              <div className="flex items-center gap-3">
                <Fuel className="h-6 w-6 text-primary" />
                <h3 className="np-h text-xl">Customer pays the Gas at checkout</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/80">
                When a customer pays you in crypto, <strong className="text-foreground">they</strong> pay
                the transaction fee — called <em>Gas</em>. That's the network's cut for actually
                confirming the transaction and mining it into a block. You get the full sale amount.
              </p>
            </div>

            <div className="np-card-navy p-8">
              <div className="flex items-center gap-3">
                <PiggyBank className="h-6 w-6 text-primary" />
                <h3 className="np-h text-xl">You pay Gas when you move funds</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/80">
                When you move those funds around later, <strong className="text-foreground">you</strong>{" "}
                pay the Gas. It varies by network and fluctuates with market conditions completely
                outside your shop.
              </p>
            </div>
          </div>

          {/* Elon example */}
          <div className="mt-6 np-card-navy overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="border-b border-border/40 p-8 md:border-b-0 md:border-r">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <p className="font-mono text-xs uppercase tracking-widest text-warning">Volatility warning</p>
                </div>
                <h4 className="mt-3 text-lg font-semibold text-foreground">
                  When Elong tweets about Doge…
                </h4>
                <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                  Ethereum gas can spike <strong className="text-foreground">10x or 100x</strong> normal.
                  A routine $0.15 transfer suddenly costs $1.50. Doesn't sound like much — until
                  you're moving $5. Then it's <em>huge</em>.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-md border border-border bg-background/40 p-3">
                    <p className="font-mono text-xs text-muted-foreground">Normal</p>
                    <p className="mt-1 font-mono text-lg text-foreground">$0.15</p>
                  </div>
                  <div className="rounded-md border border-warning/30 bg-warning/5 p-3">
                    <p className="font-mono text-xs text-warning">10x day</p>
                    <p className="mt-1 font-mono text-lg text-foreground">$1.50</p>
                  </div>
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="font-mono text-xs text-destructive">Chaos day</p>
                    <p className="mt-1 font-mono text-lg text-foreground">$15.00</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Ethereum network, illustrative.</p>
              </div>

              <div className="p-8">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-success" />
                  <p className="font-mono text-xs uppercase tracking-widest text-success">The other end</p>
                </div>
                <h4 className="mt-3 text-lg font-semibold text-foreground">
                  Then there's TXC. Digital dust.
                </h4>
                <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                  On other networks — like <strong className="text-foreground">TEXITcoin (TXC)</strong> —
                  the same transaction costs a thousandth of a penny.
                  Practically free… but <em>not actually</em> free.
                </p>
                <div className="mt-6 rounded-md border border-success/30 bg-success/5 p-4 text-center">
                  <p className="font-mono text-xs text-success">Typical TXC transfer</p>
                  <p className="mt-1 font-mono text-2xl text-foreground">~$0.00001</p>
                  <p className="mt-2 text-xs text-muted-foreground">Yes, that's four zeros.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-8">
            <p className="np-eyebrow">Our promise on Gas</p>
            <p className="mt-3 text-lg leading-relaxed text-foreground/90">
              We set the network preferences on your account to make things as cheap as possible.
              Since these fees <strong className="text-foreground">don't come to us</strong>, it's in our
              best interest to help you pay the least to use the crypto nets. Aligned incentives.
              Imagine that.
            </p>
          </div>
        </div>
      </section>

      {/* CLOSER */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="np-display text-4xl sm:text-5xl">
            You get the idea.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            No hidden interchange. No 2.9% + $0.30. No chargeback ambush at month-end.
            Just a terminal, a small monthly fee, and whatever the network charges to move your money.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/price" className="np-btn np-btn-honey">
              See the plans →
            </Link>
            <Link to="/signup" className="np-btn np-btn-ghost">
              Start a merchant account
            </Link>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">
            Still curious? Read <Link to="/manifesto" className="text-primary underline-offset-4 hover:underline">the Manifesto</Link> or
            get the <Link to="/docs" className="text-primary underline-offset-4 hover:underline">technical bits</Link>.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
