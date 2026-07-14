import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import {
  ShieldCheck,
  UserX,
  Cpu,
  Wallet,
  EyeOff,
  ScrollText,
  Landmark,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/kyc")({
  head: () => ({
    meta: [
      { title: "KYC — We Don't Know You (And We Like It That Way) · Nectar.Pay" },
      {
        name: "description",
        content:
          "Nectar.Pay is non-custodial software + hardware. No KYC to become a merchant, no snooping on your customers. You can turn on buyer KYC in your dashboard if your jurisdiction requires it.",
      },
      { property: "og:title", content: "KYC — Non-Custodial by Design" },
      {
        property: "og:description",
        content:
          "No onboarding interrogation. We never touch your money. Turn buyer KYC on when you need to — off when you don't.",
      },
      { property: "og:url", content: "https://nectar-pay.com/kyc" },
    ],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/kyc" }],
  }),
  component: KycPage,
});

function KycPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 comb-bg opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
          <p className="np-eyebrow-chip mx-auto mb-6">KYC, De-Mystified</p>
          <h1 className="np-display text-5xl leading-[0.95] sm:text-7xl">
            We don't know
            <br />
            <span className="honey-text">who you are.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            No forms. No selfies. No "please upload your passport and a utility
            bill dated within 90 days." Nectar<span className="text-primary">-Pay</span> sells
            software and hardware — not a bank account. There's nothing for us
            to KYC you about.
          </p>
          <div className="mx-auto mt-10 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-mono uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Non-custodial by design
          </div>
        </div>
      </section>

      {/* TWO COLUMNS */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-2">
          <Card
            icon={<Cpu className="h-5 w-5" />}
            title="What we DO provide"
            tone="pos"
          >
            <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <Bullet>
                <strong className="text-foreground">Software.</strong> A
                merchant dashboard, an invoice engine, checkout links, plugins,
                webhooks, an SDK.
              </Bullet>
              <Bullet>
                <strong className="text-foreground">Hardware.</strong> The
                NectarPay POS terminal, tap-to-pay flow, printer, the whole
                counter-top kit.
              </Bullet>
              <Bullet>
                <strong className="text-foreground">Rails.</strong> A path from
                a shopper's wallet to <em>your</em> wallet, on the chains you
                choose.
              </Bullet>
            </ul>
          </Card>

          <Card
            icon={<UserX className="h-5 w-5" />}
            title="What we DON'T provide"
            tone="neg"
          >
            <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <Bullet neg>
                <strong className="text-foreground">Custody.</strong> We never
                touch, hold, route, or "temporarily settle" your money. Funds
                land in your wallet. Full stop.
              </Bullet>
              <Bullet neg>
                <strong className="text-foreground">A view of your customers.</strong>{" "}
                We don't ask who they are, where they live, or what they buy.
                We can't tell you — because we don't know.
              </Bullet>
              <Bullet neg>
                <strong className="text-foreground">A bank license.</strong>{" "}
                We're not a money transmitter, a custodian, or an exchange.
                We're a payment tool, like a card reader.
              </Bullet>
            </ul>
          </Card>
        </div>
      </section>

      {/* MERCHANT KYC OPT-IN */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="np-display text-3xl sm:text-4xl">
                But <span className="honey-text">you</span> can turn KYC on for your buyers.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Some merchants — depending on jurisdiction, size, category, or
                just personal preference — need to verify who's paying them.
                We built the switch, you flip it. Head to any store's{" "}
                <strong className="text-foreground">Settings → KYC</strong> and
                choose the level that fits:
              </p>
              <ul className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <Bullet>
                  <strong className="text-foreground">None.</strong> Pure
                  non-custodial. Buyer pays, invoice settles. Default.
                </Bullet>
                <Bullet>
                  <strong className="text-foreground">Basic (free).</strong>{" "}
                  Sanctions screen, wallet risk score, country block. No
                  personal data stored.
                </Bullet>
                <Bullet>
                  <strong className="text-foreground">Advanced (BYO provider).</strong>{" "}
                  Hosted ID/selfie flow with Sumsub, Persona, Didit or Veriff.
                  You pay them directly. We store pass/fail only.
                </Bullet>
              </ul>
              <p className="mt-6 rounded-lg border border-border/60 bg-card/60 p-4 text-sm text-muted-foreground">
                <strong className="text-foreground">Please comply with your local laws.</strong>{" "}
                We strongly encourage every merchant to understand the rules
                that apply to accepting crypto payments where you operate — and
                to enable the buyer verification you need to stay on the right
                side of them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* STABLECOIN / TAX */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="np-display text-3xl sm:text-4xl">
                Stablecoins in, national currency out.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Because you're accepting <strong className="text-foreground">stablecoins
                pegged 1:1 to a fiat currency</strong>, there's typically{" "}
                <em>no gain or loss</em> at conversion time — a dollar of USDC
                is a dollar of USD.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                That said, <strong className="text-foreground">check the reporting
                requirements in your area</strong>. Some jurisdictions still
                want the transaction logged, categorized, or reported even when
                no gain occurred. Your accountant will know. If you don't have
                one, get one — they're cheaper than a fine.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY POSTURE */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            <MiniCard
              icon={<Wallet className="h-4 w-4" />}
              title="Your money is yours"
              body="Funds never sit on a Nectar.Pay balance. There is no Nectar.Pay balance."
            />
            <MiniCard
              icon={<EyeOff className="h-4 w-4" />}
              title="Your customers are yours"
              body="We don't build a profile of them. We don't sell one. We can't — we don't have one."
            />
            <MiniCard
              icon={<ScrollText className="h-4 w-4" />}
              title="The rules are yours"
              body="Local laws vary. We give you the controls; you set the policy."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="np-display text-3xl sm:text-4xl">
            Ready when you are.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            No paperwork to start. Spin up a store, take a payment, and turn
            buyer KYC on later if you need it.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Create a merchant account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/manifesto"
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-foreground hover:bg-accent"
            >
              Read the manifesto
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function Card({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "pos" | "neg";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${
        tone === "pos"
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card/60"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-md ${
            tone === "pos"
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Bullet({ children, neg }: { children: React.ReactNode; neg?: boolean }) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
          neg ? "bg-muted-foreground/60" : "bg-primary"
        }`}
      />
      <span>{children}</span>
    </li>
  );
}

function MiniCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-5">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
