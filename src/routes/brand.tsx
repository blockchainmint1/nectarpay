import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import hiveMark from "@/assets/nectar-hive-mark.png.asset.json";

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: "Brand System · Nectar.Pay" },
      {
        name: "description",
        content:
          "The complete Nectar.Pay brand system — strategy, voice, logo, color, typography, motion, mascot, applications and manifesto.",
      },
      { property: "og:title", content: "Brand System · Nectar.Pay" },
      {
        property: "og:description",
        content:
          "One hive. Endless applications. The full Nectar.Pay brand system v1.0.",
      },
      { property: "og:url", content: "https://nectar-pay.com/brand" },
    ],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/brand" }],
  }),
  component: BrandPage,
});

// ---- Brand tokens (hardcoded — this page IS the brand reference) ----
const NAVY = "#0D1B33";
const NAVY_2 = "#132446";
const HONEY = "#F6A21E";
const HONEY_DEEP = "#E8880C";
const COMB = "#FAF8F3";
const MIST = "#F3EEE2";
const INK = "#2B3242";
const SLATE = "#6A7182";

const chapters = [
  ["01", "Brand Strategy", "strategy"],
  ["02", "Personality", "personality"],
  ["03", "Brand Voice", "voice"],
  ["04", "Logo System", "logo"],
  ["05", "Color", "color"],
  ["06", "Typography", "typography"],
  ["07", "Iconography", "iconography"],
  ["08", "Graphic Language", "graphic"],
  ["09", "Photography", "photography"],
  ["10", "Illustration", "illustration"],
  ["11", "Buzzy the Mascot", "mascot"],
  ["12", "Motion", "motion"],
  ["13", "UI Language", "ui"],
  ["14", "Marketing", "marketing"],
  ["15", "Social Media", "social"],
  ["16", "Sales Materials", "sales"],
  ["17", "Website", "website"],
  ["18", "Dev Tokens", "tokens"],
  ["19", "Applications", "applications"],
  ["20", "Taglines", "taglines"],
  ["21", "Manifesto", "manifesto"],
] as const;

function BrandPage() {
  return (
    <div className="min-h-screen font-sans" style={{ background: NAVY, color: COMB }}>
      <MarketingNav />
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <Hero />
          <StrategySection />
          <PersonalitySection />
          <VoiceSection />
          <LogoSection />
          <ColorSection />
          <TypographySection />
          <IconographySection />
          <GraphicSection />
          <PhotographySection />
          <IllustrationSection />
          <MascotSection />
          <MotionSection />
          <UISection />
          <MarketingSection />
          <SocialSection />
          <SalesSection />
          <WebsiteSection />
          <TokensSection />
          <ApplicationsSection />
          <TaglinesSection />
          <ManifestoSection />
          <div style={{ background: COMB, color: INK }}>
            <MarketingFooter />
          </div>
        </main>
      </div>
    </div>
  );
}

/* ============================ SIDEBAR ============================ */

function Sidebar() {
  return (
    <aside
      className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r px-6 py-8 lg:block"
      style={{ background: NAVY, borderColor: "rgba(255,255,255,0.08)" }}
    >
      <Link to="/" className="flex items-center gap-2">
        <img src={hiveMark.url} alt="" className="h-7 w-7" />
        <span className="text-lg font-black tracking-tight">
          Nectar<span style={{ color: HONEY }}>Pay</span>
        </span>
      </Link>
      <div
        className="mt-6 font-mono text-[10px] tracking-[0.25em]"
        style={{ color: SLATE }}
      >
        BRAND SYSTEM · V1.0
      </div>
      <nav className="mt-6 space-y-1 text-sm">
        {chapters.map(([num, label, id]) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-white/5"
            style={{ color: "rgba(250,248,243,0.75)" }}
          >
            <span className="font-mono text-[10px]" style={{ color: SLATE }}>
              {num}
            </span>
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="mt-8 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <Link
          to="/"
          className="font-mono text-[10px] tracking-widest hover:text-white"
          style={{ color: SLATE }}
        >
          ← BACK TO SITE
        </Link>
      </div>
    </aside>
  );
}

/* ============================ HELPERS ============================ */

function ChapterHeader({ num, kicker }: { num: string; kicker: string }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <span
        className="rounded px-2 py-1 font-mono text-xs font-bold"
        style={{ background: "rgba(246,162,30,0.15)", color: HONEY }}
      >
        {num}
      </span>
      <span
        className="font-mono text-xs tracking-[0.25em]"
        style={{ color: SLATE }}
      >
        {kicker}
      </span>
    </div>
  );
}

function Section({
  id,
  dark,
  children,
}: {
  id: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-4 px-6 py-24 md:px-14"
      style={{
        background: dark ? NAVY : COMB,
        color: dark ? COMB : INK,
      }}
    >
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-4xl font-black tracking-tight md:text-5xl">{children}</h2>
  );
}

function Lede({
  children,
  dark,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <p
      className="mt-6 max-w-3xl text-lg leading-relaxed"
      style={{ color: dark ? "rgba(250,248,243,0.75)" : SLATE }}
    >
      {children}
    </p>
  );
}

function Card({
  children,
  dark,
  className = "",
}: {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{
        background: dark ? NAVY_2 : "#fff",
        border: dark ? "1px solid rgba(255,255,255,0.06)" : `1px solid ${MIST}`,
      }}
    >
      {children}
    </div>
  );
}

function CardKicker({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-3 font-mono text-[11px] tracking-[0.2em]"
      style={{ color: HONEY }}
    >
      {children}
    </div>
  );
}

/* ============================ HERO ============================ */

function Hero() {
  return (
    <section
      className="relative overflow-hidden px-6 py-24 md:px-14"
      style={{ background: NAVY }}
    >
      {/* Honeycomb backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='56' height='48' viewBox='0 0 56 48'><polygon points='14,0 42,0 56,24 42,48 14,48 0,24' fill='none' stroke='%23F6A21E' stroke-width='1'/></svg>")`,
          backgroundSize: "56px 48px",
        }}
      />
      <div className="relative mx-auto max-w-5xl">
        <div
          className="inline-block rounded border px-3 py-1 font-mono text-[11px] tracking-[0.2em]"
          style={{ borderColor: "rgba(246,162,30,0.4)", color: HONEY }}
        >
          THE NECTARPAY BRAND SYSTEM
        </div>
        <div className="mt-8 flex items-center gap-5">
          <img src={hiveMark.url} alt="" className="h-16 w-16 md:h-24 md:w-24" />
          <h1 className="text-5xl font-black tracking-tight md:text-7xl">
            Nectar<span style={{ color: HONEY }}>Pay</span>
          </h1>
        </div>
        <p className="mt-8 max-w-3xl text-2xl leading-snug md:text-3xl">
          The easiest, safest and smartest way to accept crypto payments.
        </p>
        <p
          className="mt-4 max-w-2xl leading-relaxed"
          style={{ color: "rgba(250,248,243,0.7)" }}
        >
          A complete brand system for a non-custodial, zero-fee crypto payment
          ecosystem — built merchant-first, for Bitcoin, TEXITcoin, stablecoins
          and every digital currency still to come.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#strategy"
            className="rounded-lg px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
            style={{ background: HONEY, color: NAVY }}
          >
            Explore the system →
          </a>
          <a
            href="#logo"
            className="rounded-lg border px-5 py-3 text-sm font-semibold hover:bg-white/5"
            style={{ borderColor: "rgba(255,255,255,0.15)", color: COMB }}
          >
            Logo &amp; assets
          </a>
        </div>

        <div
          className="mt-14 grid max-w-3xl grid-cols-2 gap-8 border-t pt-8 md:grid-cols-4"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          {[
            ["0%", "Transaction fees"],
            ["100%", "Non-custodial"],
            ["21", "System chapters"],
            ["∞", "Future currencies"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="text-3xl font-black">{n}</div>
              <div
                className="mt-1 text-xs uppercase tracking-wider"
                style={{ color: SLATE }}
              >
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ 01 STRATEGY ============================ */

function StrategySection() {
  return (
    <Section id="strategy">
      <ChapterHeader num="01" kicker="BRAND STRATEGY" />
      <H2>Give economic control back to the people who create value.</H2>
      <Lede>
        Everything NectarPay makes should communicate one feeling:{" "}
        <strong className="text-inherit">
          this is the easiest, safest and smartest way to accept crypto payments.
        </strong>{" "}
        Strategy is how we keep that promise honest across every touchpoint.
      </Lede>

      <div
        className="mt-10 rounded-2xl p-8"
        style={{ background: NAVY, color: COMB }}
      >
        <CardKicker>POSITIONING STATEMENT</CardKicker>
        <p className="text-lg leading-relaxed">
          For modern businesses that want to accept crypto without the cost,
          custody risk or complexity,{" "}
          <span style={{ color: HONEY }}>NectarPay</span> is the non-custodial
          payment ecosystem that settles instantly into wallets the merchant
          fully controls — because unlike traditional processors and custodial
          gateways, we charge{" "}
          <span style={{ color: HONEY }}>zero transaction fees</span> and never
          touch your funds.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardKicker>MISSION</CardKicker>
          <p>
            Make accepting crypto so simple, safe and fair that any business —
            from the corner café to the global retailer — can start on day one
            and keep every cent they earn.
          </p>
        </Card>
        <Card>
          <CardKicker>VISION</CardKicker>
          <p>
            A world where money moves as freely as a conversation — and the
            people who create value are the ones who keep it.
          </p>
        </Card>
        <Card>
          <CardKicker>PURPOSE</CardKicker>
          <p>
            To hand economic control back to merchants — their money, their
            keys, their business.
          </p>
        </Card>
      </div>

      <div
        className="mt-8 rounded-2xl p-8 text-center"
        style={{ background: HONEY, color: NAVY }}
      >
        <div className="font-mono text-[11px] tracking-[0.25em]">
          BRAND PROMISE
        </div>
        <p className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
          Zero fees. Your keys. Instant settlement. No surprises — ever.
        </p>
      </div>

      <h3
        className="mt-14 font-mono text-xs tracking-[0.25em]"
        style={{ color: SLATE }}
      >
        CORE VALUES
      </h3>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          ["Honest", "We say what we mean, price what we charge, and hide nothing."],
          ["Merchant-first", "Every decision starts with the person accepting the payment."],
          ["Simple", "If it needs a manual, we haven't finished designing it."],
          ["Secure", "Self-custody and safety are the default, not an upgrade."],
          ["Optimistic", "We build for the money the world is moving toward."],
          ["Crafted", "Details are not decoration — they are how trust is earned."],
        ].map(([t, d]) => (
          <Card key={t}>
            <div className="font-bold" style={{ color: HONEY_DEEP }}>
              {t}
            </div>
            <p className="mt-1 text-sm" style={{ color: SLATE }}>
              {d}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <Card>
          <CardKicker>UNIQUE SELLING PROPOSITION</CardKicker>
          <p className="text-lg">
            The only payment network combining zero fees, true self-custody and
            instant settlement — inside one beautiful merchant experience.
          </p>
        </Card>
        <Card>
          <CardKicker>ELEVATOR PITCH</CardKicker>
          <p className="italic">
            "NectarPay lets any business accept Bitcoin, stablecoins and more
            with zero fees — settling instantly to a wallet you alone control.
            It's Stripe-simple, but you keep 100% of every sale."
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-3">
        {[
          "Zero fees where competitors take 1–3% of every sale.",
          "Non-custodial — funds never sit on our balance sheet.",
          "Instant settlement, no 2–7 day holds.",
          "Multi-asset & future-proof — BTC, TEXITcoin, stablecoins and beyond.",
        ].map((line) => (
          <div key={line} className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: HONEY, color: NAVY }}
            >
              ✓
            </span>
            <span>{line}</span>
          </div>
        ))}
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <Card>
          <CardKicker>ORIGIN STORY</CardKicker>
          <p className="text-sm leading-relaxed">
            NectarPay began with a simple frustration: a small-business owner
            watching 3% of every hard-won sale disappear to a processor that
            also held their money for a week. Crypto promised something better —
            direct, instant, fee-free value — but the tools felt built for
            traders, not shopkeepers. So we built the payment experience we
            wished existed: as calm and trustworthy as the best fintech, as
            fair as crypto was always meant to be. Named for the nectar bees
            gather and return to the hive — value, created by many, kept by
            those who earn it.
          </p>
        </Card>
        <Card>
          <CardKicker>WHY WE EXIST</CardKicker>
          <p className="text-lg leading-relaxed">
            Because the people who do the work should keep the reward. Payments
            should be a bridge, not a toll booth.
          </p>
        </Card>
      </div>
    </Section>
  );
}

/* ============================ 02 PERSONALITY ============================ */

function PersonalitySection() {
  const sliders: Array<[string, string, number]> = [
    ["Friendly", "Professional", 40],
    ["Accessible", "Luxury", 35],
    ["Serious", "Playful", 55],
    ["Innovative", "Familiar", 30],
    ["Minimal", "Bold", 55],
    ["Reliable", "Exciting", 40],
  ];
  return (
    <Section id="personality" dark>
      <ChapterHeader num="02" kicker="BRAND PERSONALITY" />
      <H2>Confident, helpful, optimistic, intelligent — and unmistakably human.</H2>
      <Lede dark>
        Think Apple simplicity, Stripe elegance, Coinbase trust, Tesla boldness,
        Notion clarity. Never corporate. Never cold. Never hype. Never
        "crypto-bro."
      </Lede>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card dark>
          <CardKicker>PERSONALITY SLIDERS</CardKicker>
          <div className="space-y-5">
            {sliders.map(([a, b, v]) => (
              <div key={a}>
                <div className="mb-1 flex justify-between text-xs" style={{ color: "rgba(250,248,243,0.7)" }}>
                  <span>{a}</span>
                  <span>{b}</span>
                </div>
                <div
                  className="relative h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <div
                    className="absolute -top-1 h-3 w-3 rounded-full"
                    style={{
                      background: HONEY,
                      left: `calc(${v}% - 6px)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card dark>
            <CardKicker>ARCHETYPE</CardKicker>
            <div className="text-2xl font-black">The Trusted Guide</div>
            <p className="mt-2 text-sm" style={{ color: "rgba(250,248,243,0.7)" }}>
              A calm, capable expert who makes something intimidating feel
              effortless — and roots for you the whole way.
            </p>
          </Card>
          <Card dark>
            <CardKicker>HOW THE BRAND SPEAKS</CardKicker>
            <div className="space-y-3 text-sm">
              {[
                "You're all set — your first payment lands the moment your customer taps.",
                "No fees, no hold, no catch. That's just how NectarPay works.",
                "Your keys stay yours. We only make the moment simple.",
              ].map((q) => (
                <div
                  key={q}
                  className="rounded-lg px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  "{q}"
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Section>
  );
}

/* ============================ 03 VOICE ============================ */

function VoiceSection() {
  return (
    <Section id="voice">
      <ChapterHeader num="03" kicker="BRAND VOICE" />
      <H2>Write like a trusted friend who happens to be an expert.</H2>
      <Lede>
        Short sentences. Plain words. Real answers. We use active voice, sentence
        case, and the second person ("you"). We skip jargon, hype and
        exclamation-mark theatrics — clarity is the flex.
      </Lede>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["Clear over clever", "If a customer has to re-read it, we rewrite it."],
          ["Warm, not chummy", "Friendly and human — never forced slang or emoji spam."],
          ["Honest, always", "No dark patterns, no fine print surprises, no fake urgency."],
          ["Confident, not loud", "We state facts calmly. The product does the shouting."],
        ].map(([t, d]) => (
          <Card key={t}>
            <div className="font-bold">{t}</div>
            <p className="mt-2 text-sm" style={{ color: SLATE }}>
              {d}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardKicker>TONE BY CONTEXT</CardKicker>
          <div className="divide-y" style={{ borderColor: MIST }}>
            {[
              ["Onboarding", "Encouraging and light. Celebrate each step. \"Nice — one more and you're live.\""],
              ["Support", "Calm, human, accountable. Own the problem, then fix it."],
              ["Developer", "Precise and terse. Respect their time; lead with the code."],
              ["Marketing", "Confident and warm. Sell the outcome, never the hype."],
              ["Social", "Playful but sharp. Smart, kind, occasionally witty."],
            ].map(([ctx, tone]) => (
              <div
                key={ctx}
                className="grid grid-cols-[110px_1fr] gap-4 py-3 text-sm"
                style={{ borderColor: MIST }}
              >
                <div className="font-semibold">{ctx}</div>
                <div style={{ color: SLATE }}>{tone}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardKicker>MESSAGE PATTERNS</CardKicker>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg px-3 py-2" style={{ background: "#DCFCE7", color: "#065F46" }}>
              <div className="font-mono text-[10px]">● SUCCESS</div>
              Paid. $48.00 just landed in your wallet.
            </div>
            <div className="rounded-lg px-3 py-2" style={{ background: "#FEE2E2", color: "#991B1B" }}>
              <div className="font-mono text-[10px]">● ERROR</div>
              That payment didn't go through. Nothing was charged — let's try again.
            </div>
            <div className="rounded-lg px-3 py-2" style={{ background: "#FEF3C7", color: "#92400E" }}>
              <div className="font-mono text-[10px]">● NOTIFICATION</div>
              Your daily summary is ready — 14 payments, zero fees.
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl p-6" style={{ background: "#DCFCE7", color: "#065F46" }}>
          <div className="mb-3 font-mono text-xs tracking-widest">✓ DO</div>
          <ul className="space-y-2 text-sm">
            {[
              "Use \"you\" and \"your money.\"",
              "Lead with the benefit, then the detail.",
              "Say \"zero fees,\" not \"low-cost.\"",
              "Keep sentences under 20 words.",
              "Name the number: \"$0 in fees this month.\"",
            ].map((l) => (
              <li key={l}>✓ {l}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "#FEE2E2", color: "#991B1B" }}>
          <div className="mb-3 font-mono text-xs tracking-widest">✕ DON'T</div>
          <ul className="space-y-2 text-sm">
            {[
              "Don't say \"revolutionary,\" \"disrupt,\" or \"to the moon.\"",
              "Don't stack exclamation marks or emoji.",
              "Don't bury terms in fine print.",
              "Don't use fear or fake urgency.",
              "Don't talk down to non-crypto merchants.",
            ].map((l) => (
              <li key={l}>✕ {l}</li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ============================ 04 LOGO ============================ */

function LogoLockup({ mono, invert }: { mono?: boolean; invert?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={hiveMark.url}
        alt=""
        className={`h-10 w-10 ${mono ? "grayscale" : ""}`}
        style={invert ? { filter: "brightness(0) invert(1)" } : undefined}
      />
      <span className="text-2xl font-black tracking-tight">
        Nectar<span style={{ color: mono ? "inherit" : HONEY }}>Pay</span>
      </span>
    </div>
  );
}

function LogoSection() {
  return (
    <Section id="logo" dark>
      <ChapterHeader num="04" kicker="LOGO SYSTEM" />
      <H2>One hive. Endless applications.</H2>
      <Lede dark>
        The mark is a stylised hive built from tap-to-pay waves — value gathered
        and kept. Use the logo exactly as supplied. Never redraw, retype or
        recolor it outside these standards.
      </Lede>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl p-10" style={{ background: COMB }}>
          <div style={{ color: NAVY }}>
            <LogoLockup />
          </div>
          <div className="mt-6 font-mono text-[10px] tracking-widest" style={{ color: SLATE }}>
            PRIMARY · LIGHT BACKGROUND
          </div>
        </div>
        <div className="rounded-2xl p-10" style={{ background: NAVY_2 }}>
          <LogoLockup />
          <div className="mt-6 font-mono text-[10px] tracking-widest" style={{ color: SLATE }}>
            PRIMARY · DARK BACKGROUND
          </div>
        </div>
      </div>

      <h3 className="mt-14 font-mono text-xs tracking-[0.25em]" style={{ color: SLATE }}>
        MONOCHROME & ONE-COLOR
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { name: "Navy", bg: "#fff", fg: NAVY },
          { name: "Honey", bg: NAVY_2, fg: HONEY },
          { name: "Reversed", bg: NAVY_2, fg: "#fff" },
          { name: "Black", bg: "#fff", fg: "#000" },
        ].map((v) => (
          <div key={v.name} className="rounded-xl p-6 text-center" style={{ background: v.bg }}>
            <img
              src={hiveMark.url}
              alt=""
              className="mx-auto h-10 w-10"
              style={{ filter: `drop-shadow(0 0 0 ${v.fg})` }}
            />
            <div className="mt-3 font-mono text-[10px] tracking-widest" style={{ color: v.fg }}>
              {v.name.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <Card dark>
          <CardKicker>CLEAR SPACE &amp; MINIMUM SIZE</CardKicker>
          <p className="text-sm" style={{ color: "rgba(250,248,243,0.75)" }}>
            Clear space = the height of one hive stripe (x) on all sides.
            Minimum size: 24 px icon on screen · 10 mm in print.
          </p>
        </Card>
        <Card dark>
          <CardKicker>APP ICONS</CardKicker>
          <div className="flex items-end gap-4">
            {[64, 48, 32, 20].map((s) => (
              <img key={s} src={hiveMark.url} alt="" style={{ width: s, height: s }} />
            ))}
          </div>
        </Card>
      </div>

      <h3 className="mt-14 font-mono text-xs tracking-[0.25em]" style={{ color: "#F87171" }}>
        ✕ IMPROPER USAGE — NEVER DO THIS
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          ["Don't stretch", { transform: "scaleX(1.6)" }],
          ["Don't recolor", { filter: "hue-rotate(180deg)" }],
          ["Don't rotate", { transform: "rotate(20deg)" }],
          ["Don't add glow", { filter: "drop-shadow(0 0 12px #F6A21E)" }],
          ["Don't use busy bg", {}],
          ["Don't outline type", {}],
        ].map(([label, style], i) => (
          <div
            key={i}
            className="relative rounded-xl p-4"
            style={{
              background:
                label === "Don't use busy bg"
                  ? "repeating-linear-gradient(45deg,#F6A21E,#F6A21E 8px,#0D1B33 8px,#0D1B33 16px)"
                  : "#fff",
            }}
          >
            <img
              src={hiveMark.url}
              alt=""
              className="mx-auto h-8 w-8"
              style={style as React.CSSProperties}
            />
            <div className="mt-3 text-center text-[10px]" style={{ color: NAVY }}>
              {label as string}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ============================ 05 COLOR ============================ */

function Swatch({
  name,
  hex,
  dark,
  big,
}: {
  name: string;
  hex: string;
  dark?: boolean;
  big?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(hex);
        setCopied(true);
        setTimeout(() => setCopied(false), 900);
      }}
      className={`group text-left transition-transform hover:-translate-y-0.5 ${big ? "" : ""}`}
    >
      <div
        className="rounded-lg"
        style={{
          background: hex,
          height: big ? 140 : 80,
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      />
      <div className="mt-2 text-sm font-semibold" style={{ color: dark ? "inherit" : INK }}>
        {name}
      </div>
      <div
        className="font-mono text-[11px]"
        style={{ color: dark ? "rgba(250,248,243,0.6)" : SLATE }}
      >
        {copied ? "Copied!" : hex}
      </div>
    </button>
  );
}

function ColorSection() {
  const honeyScale = [
    ["50", "#FEF6E1"],
    ["100", "#FDECC0"],
    ["200", "#FBD87E"],
    ["300", "#F9C33E"],
    ["400", "#F6A21E"],
    ["500", "#E8880C"],
    ["600", "#C56E08"],
  ];
  const neutrals = [
    ["White", "#FFFFFF"],
    ["Comb", "#FAF8F3"],
    ["Mist", "#F3EEE2"],
    ["Sand", "#EBE6DA"],
    ["Slate", "#6A7182"],
    ["Ink", "#2B3242"],
    ["Navy", "#0D1B33"],
  ];
  const states = [
    ["Success", "#1E9E6A"],
    ["Warning", "#E9930B"],
    ["Danger", "#E5484D"],
    ["Info", "#3B82F6"],
  ];
  return (
    <Section id="color">
      <ChapterHeader num="05" kicker="COLOR SYSTEM" />
      <H2>Honey warmth on a foundation of trust.</H2>
      <Lede>
        Hive Navy anchors everything with fintech seriousness; Nectar Honey brings
        optimism and energy. Neutrals are warm, never clinical. Click any swatch
        to copy its value.
      </Lede>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-baseline justify-between">
            <div className="text-xl font-bold">Nectar Honey</div>
            <div className="font-mono text-xs" style={{ color: SLATE }}>PRIMARY</div>
          </div>
          <Swatch name="Honey" hex="#F6A21E" big />
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs" style={{ color: SLATE }}>
            <div>RGB<br/>246 · 162 · 30</div>
            <div>CMYK<br/>0 · 35 · 88 · 4</div>
            <div>Use<br/>Accent · CTA</div>
          </div>
        </Card>
        <Card>
          <div className="mb-4 flex items-baseline justify-between">
            <div className="text-xl font-bold">Hive Navy</div>
            <div className="font-mono text-xs" style={{ color: SLATE }}>SECONDARY</div>
          </div>
          <Swatch name="Navy" hex="#0D1B33" big />
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs" style={{ color: SLATE }}>
            <div>RGB<br/>13 · 27 · 51</div>
            <div>CMYK<br/>75 · 47 · 0 · 80</div>
            <div>Use<br/>Ink · Surfaces</div>
          </div>
        </Card>
      </div>

      <h3 className="mt-14 font-mono text-xs tracking-[0.25em]" style={{ color: SLATE }}>
        HONEY SCALE
      </h3>
      <div className="mt-4 grid grid-cols-4 gap-3 md:grid-cols-7">
        {honeyScale.map(([n, h]) => (
          <Swatch key={n} name={n} hex={h} />
        ))}
      </div>

      <h3 className="mt-14 font-mono text-xs tracking-[0.25em]" style={{ color: SLATE }}>
        INK &amp; WARM NEUTRALS
      </h3>
      <div className="mt-4 grid grid-cols-4 gap-3 md:grid-cols-7">
        {neutrals.map(([n, h]) => (
          <Swatch key={n} name={n} hex={h} />
        ))}
      </div>

      <h3 className="mt-14 font-mono text-xs tracking-[0.25em]" style={{ color: SLATE }}>
        SYSTEM STATES
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {states.map(([n, h]) => (
          <Swatch key={n} name={n} hex={h} />
        ))}
      </div>

      <h3 className="mt-14 font-mono text-xs tracking-[0.25em]" style={{ color: SLATE }}>
        SIGNATURE GRADIENTS
      </h3>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="h-24 rounded-xl" style={{ background: `linear-gradient(135deg, ${HONEY}, ${HONEY_DEEP})` }} />
        <div className="h-24 rounded-xl" style={{ background: `linear-gradient(135deg, ${NAVY}, #24365E)` }} />
        <div className="h-24 rounded-xl" style={{ background: `linear-gradient(135deg, ${HONEY}, ${NAVY})` }} />
      </div>

      <div className="mt-10 rounded-2xl p-6" style={{ background: NAVY, color: COMB }}>
        <pre className="overflow-x-auto font-mono text-xs leading-relaxed">
{`:root {
  --honey-400: #F6A21E;
  --honey-500: #E8880C;
  --navy-900:  #0D1B33;
  --comb:      #FAF8F3;
  --success:   #1E9E6A;
  --danger:    #E5484D;
}`}
        </pre>
      </div>
    </Section>
  );
}

/* ============================ 06 TYPOGRAPHY ============================ */

function TypographySection() {
  return (
    <Section id="typography" dark>
      <ChapterHeader num="06" kicker="TYPOGRAPHY" />
      <H2>Geometric confidence. Effortless reading.</H2>
      <Lede dark>
        Satoshi for expressive display and headlines, General Sans for calm,
        legible body, JetBrains Mono for numbers and code. Three voices, one
        clear hierarchy.
      </Lede>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["Satoshi", "Display & Headings", "400 · 500 · 700 · 900"],
          ["General Sans", "Body & Interface", "400 · 500 · 600"],
          ["JetBrains Mono", "Numbers, code, labels", "400 · 500 · 700"],
        ].map(([name, use, wt]) => (
          <Card dark key={name}>
            <div className="text-6xl font-black leading-none">Aa</div>
            <div className="mt-4 text-lg font-bold">{name}</div>
            <div className="text-sm" style={{ color: "rgba(250,248,243,0.7)" }}>{use}</div>
            <div className="mt-2 font-mono text-[11px]" style={{ color: SLATE }}>{wt}</div>
          </Card>
        ))}
      </div>

      <div className="mt-10 space-y-6 rounded-2xl p-8" style={{ background: NAVY_2 }}>
        <TypeRow spec="Display · 72 / 900" text="Keep every cent" size="text-6xl md:text-7xl" weight="font-black" />
        <TypeRow spec="H1 · 48 / 900" text="Accept crypto beautifully" size="text-4xl md:text-5xl" weight="font-black" />
        <TypeRow spec="H2 · 34 / 700" text="Your wallet, your money" size="text-3xl" weight="font-bold" />
        <TypeRow spec="H3 · 24 / 700" text="Instant, non-custodial settlement" size="text-2xl" weight="font-bold" />
        <TypeRow spec="Body L · 19 / 500" text="Payments should be a bridge, not a toll booth." size="text-lg" weight="font-medium" />
        <TypeRow spec="Body M · 16 / 400" text="NectarPay settles instantly to a wallet only you control." size="text-base" weight="font-normal" />
        <TypeRow spec="Mono · 13 / 500" text="$0.00 FEES · SETTLED 0.4s" size="text-sm font-mono" weight="" />
      </div>
    </Section>
  );
}

function TypeRow({ spec, text, size, weight }: { spec: string; text: string; size: string; weight: string }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] tracking-widest" style={{ color: SLATE }}>{spec}</div>
      <div className={`${size} ${weight}`}>{text}</div>
    </div>
  );
}

/* ============================ 07 ICONOGRAPHY ============================ */

function IconographySection() {
  const icons = [
    "Payments","Wallet","Bitcoin","Stablecoins",
    "QR code","Tap to pay","Security","Your keys",
    "Terminal","Merchant","Invoice","Send",
    "Instant","Global","Insights","Verified",
  ];
  return (
    <Section id="iconography">
      <ChapterHeader num="07" kicker="ICONOGRAPHY" />
      <H2>Rounded, minimal, unmistakably fintech.</H2>
      <Lede>
        One consistent line-icon language: 24px grid, 2px stroke, rounded caps
        and joins. Calm geometry that reads instantly on a terminal, a dashboard,
        or a phone in bright sun.
      </Lede>

      <div className="mt-10 grid gap-6 md:grid-cols-[280px_1fr]">
        <Card>
          <CardKicker>CONSTRUCTION RULES</CardKicker>
          <ul className="space-y-2 text-sm" style={{ color: SLATE }}>
            <li>· 24 × 24 px grid, 2 px padding</li>
            <li>· 2 px stroke, rounded caps + joins</li>
            <li>· Outline style — never filled</li>
            <li>· Single accent max (honey) per icon</li>
            <li>· Optical consistency over mathematical</li>
          </ul>
        </Card>
        <Card>
          <div className="grid grid-cols-4 gap-3">
            {icons.map((label) => (
              <div key={label} className="rounded-lg p-3 text-center" style={{ background: MIST }}>
                <div className="mx-auto mb-1 h-6 w-6 rounded" style={{ border: `2px solid ${INK}` }} />
                <div className="text-[10px]" style={{ color: SLATE }}>{label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-8 rounded-2xl p-6" style={{ background: "#FEF6E1" }}>
        <CardKicker>SIGNATURE BRAND ICONS — THE HIVE FAMILY</CardKicker>
        <div className="mt-2 grid gap-4 md:grid-cols-[repeat(4,auto)_1fr]">
          {["Hive", "Honeycomb", "Tap to pay", "Filled cell"].map((n) => (
            <div key={n} className="rounded-xl bg-white p-4 text-center">
              <img src={hiveMark.url} alt="" className="mx-auto h-10 w-10" />
              <div className="mt-2 text-xs" style={{ color: SLATE }}>{n}</div>
            </div>
          ))}
          <p className="self-center text-sm" style={{ color: INK }}>
            The hive and honeycomb are reserved, brand-owned marks. Use them for
            hero moments and empty states — never mix them into functional UI
            icon rows.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ============================ 08 GRAPHIC ============================ */

function GraphicSection() {
  return (
    <Section id="graphic" dark>
      <ChapterHeader num="08" kicker="GRAPHIC LANGUAGE" />
      <H2>A visual world built from hives, waves and flow.</H2>
      <Lede dark>
        Honeycomb geometry, tap-to-pay waves, network flow and digital honey —
        used with restraint. Motifs support the message; they never shout over
        it.
      </Lede>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <GraphicTile
          title="Honeycomb grid"
          subtitle="Backgrounds & texture, ≤14% opacity"
          bg={NAVY_2}
          preview={
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='56' height='48' viewBox='0 0 56 48'><polygon points='14,0 42,0 56,24 42,48 14,48 0,24' fill='none' stroke='%23F6A21E' stroke-width='1.5'/></svg>")`,
                backgroundSize: "56px 48px",
                opacity: 0.5,
              }}
            />
          }
        />
        <GraphicTile
          title="Tap-to-pay waves"
          subtitle="Signals connection & instant flow"
          bg={NAVY_2}
          preview={
            <div className="flex h-full items-center justify-center">
              <div className="relative">
                {[24, 40, 56].map((s, i) => (
                  <div
                    key={s}
                    className="absolute rounded-full"
                    style={{
                      width: s,
                      height: s,
                      left: -s / 2,
                      top: -s / 2,
                      border: `2px solid ${HONEY}`,
                      opacity: 1 - i * 0.3,
                    }}
                  />
                ))}
              </div>
            </div>
          }
        />
        <GraphicTile
          title="Payment network"
          subtitle="Merchant ↔ wallet ↔ chain flow"
          bg={NAVY_2}
          preview={
            <svg viewBox="0 0 200 100" className="h-full w-full">
              <line x1="20" y1="50" x2="100" y2="30" stroke={HONEY} strokeWidth="1" />
              <line x1="100" y1="30" x2="180" y2="60" stroke={HONEY} strokeWidth="1" />
              <line x1="100" y1="30" x2="140" y2="80" stroke={HONEY} strokeWidth="1" />
              {[[20,50],[100,30],[180,60],[140,80]].map(([x,y],i) => (
                <circle key={i} cx={x} cy={y} r="5" fill={HONEY} />
              ))}
            </svg>
          }
        />
        <GraphicTile
          title="Digital honey"
          subtitle="Warm gradient for hero fills"
          bg={`linear-gradient(135deg, ${HONEY}, ${HONEY_DEEP})`}
          preview={<div />}
        />
        <GraphicTile
          title="Glassmorphism"
          subtitle="Sparingly, for live-value overlays"
          bg={NAVY_2}
          preview={
            <div className="flex h-full items-center justify-center">
              <div
                className="rounded-lg px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <div className="font-mono text-[10px]" style={{ color: SLATE }}>RECEIVED</div>
                <div className="text-lg font-black">$128.00</div>
              </div>
            </div>
          }
        />
        <GraphicTile
          title="Elevation scale"
          subtitle="Soft, warm-tinted shadows only"
          bg={COMB}
          preview={
            <div className="flex h-full items-center justify-center gap-3">
              {[6, 12, 24].map((s) => (
                <div
                  key={s}
                  className="h-12 w-12 rounded-lg bg-white"
                  style={{ boxShadow: `0 ${s}px ${s * 2}px rgba(246,162,30,0.25)` }}
                />
              ))}
            </div>
          }
        />
      </div>
    </Section>
  );
}

function GraphicTile({
  title,
  subtitle,
  bg,
  preview,
}: {
  title: string;
  subtitle: string;
  bg: string;
  preview: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: NAVY_2 }}>
      <div className="relative h-40 overflow-hidden" style={{ background: bg }}>
        {preview}
      </div>
      <div className="p-4">
        <div className="font-bold">{title}</div>
        <div className="text-xs" style={{ color: SLATE }}>{subtitle}</div>
      </div>
    </div>
  );
}

/* ============================ 09 PHOTOGRAPHY ============================ */

function PhotographySection() {
  const frames = [
    "Corner café — barista + customer",
    "Farmers market — local + honest",
    "Boutique retail — premium calm",
    "Restaurant — warmth & hospitality",
    "Owner portrait — confident, human",
    "The tap — the hero moment",
  ];
  return (
    <Section id="photography">
      <ChapterHeader num="09" kicker="PHOTOGRAPHY DIRECTION" />
      <H2>Real people. Real businesses. Warm, natural light.</H2>
      <Lede>
        We photograph the moment a payment simply works — a smile across the
        counter, a tap, a nod. Never staged crypto clichés or glowing charts.
      </Lede>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {frames.map((f) => (
          <div key={f} className="overflow-hidden rounded-2xl" style={{ background: MIST }}>
            <div
              className="h-48"
              style={{
                background: `linear-gradient(135deg, rgba(246,162,30,0.15), rgba(13,27,51,0.05))`,
              }}
            />
            <div className="p-3 text-xs" style={{ color: SLATE }}>{f}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardKicker>DIRECTION</CardKicker>
          <ul className="space-y-2 text-sm" style={{ color: SLATE }}>
            <li>· Natural, directional daylight — golden, never flat</li>
            <li>· Candid moments over posed stock smiles</li>
            <li>· Genuinely diverse people, ages and businesses</li>
            <li>· Warm tones; a subtle honey grade in post</li>
            <li>· Shallow depth — hero the human, blur the rest</li>
          </ul>
        </Card>
        <div className="rounded-2xl p-6" style={{ background: "#FEE2E2", color: "#991B1B" }}>
          <div className="mb-3 font-mono text-xs tracking-widest">✕ AVOID</div>
          <ul className="space-y-2 text-sm">
            <li>✕ Glowing charts, coins raining, "to the moon"</li>
            <li>✕ Cold blue tech gradients &amp; neon</li>
            <li>✕ Hooded "hacker" or trader stereotypes</li>
            <li>✕ Obvious stock-photo staging</li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ============================ 10 ILLUSTRATION ============================ */

function IllustrationSection() {
  return (
    <Section id="illustration" dark>
      <ChapterHeader num="10" kicker="ILLUSTRATION STYLE" />
      <H2>Geometric, gradient, softly dimensional.</H2>
      <Lede dark>
        Built from the hive language — hexagons, honey gradients and clean
        shapes. Flat for UI and docs, soft-3D for hero moments, line-art for
        developer content.
      </Lede>

      <div className="mt-10 grid gap-4 md:grid-cols-5">
        {[
          ["Flat geometric", "UI · docs · icons"],
          ["Soft 3D honey", "Hero · marketing"],
          ["Gradient", "Backgrounds · abstract"],
          ["Outlined line-art", "Developer · blog"],
          ["Sticker", "Social · swag"],
        ].map(([t, s]) => (
          <div key={t} className="overflow-hidden rounded-2xl" style={{ background: NAVY_2 }}>
            <div
              className="flex h-32 items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${HONEY}22, ${NAVY_2})` }}
            >
              <svg viewBox="0 0 60 60" className="h-16 w-16">
                <polygon
                  points="15,2 45,2 58,30 45,58 15,58 2,30"
                  fill={HONEY}
                  opacity="0.9"
                />
              </svg>
            </div>
            <div className="p-3">
              <div className="text-sm font-bold">{t}</div>
              <div className="text-[11px]" style={{ color: SLATE }}>{s}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm" style={{ color: "rgba(250,248,243,0.7)" }}>
        Rule of thumb — one illustration style per surface. Always resolve
        shapes back to the hexagon grid, and keep line weights matched to the
        icon system (2px).
      </p>
    </Section>
  );
}

/* ============================ 11 MASCOT ============================ */

function MascotSection() {
  const buzzy = [
    buzzy1, buzzy2, buzzy3, buzzy4, buzzy5, buzzy6, buzzy7, buzzy8, buzzyMascot,
  ];
  const expressions = ["Happy", "Cheering", "Waving", "Focused", "Thinking", "Working", "Celebrating", "Chill", "Hero"];
  return (
    <Section id="mascot">
      <ChapterHeader num="11" kicker="MASCOT GUIDELINES" />
      <H2>Meet Buzzy.</H2>
      <Lede>
        Buzzy is NectarPay's friendly guide — a busy little bee who makes crypto
        feel warm and easy. Optimistic, clever and endlessly helpful, Buzzy
        celebrates your wins and never, ever hypes.
      </Lede>

      <div className="mt-8 flex flex-wrap gap-2">
        {["Optimistic", "Helpful", "Clever", "Warm", "Never hype"].map((t) => (
          <span
            key={t}
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: "#FEF6E1", color: HONEY_DEEP }}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Hero portrait */}
      <div
        className="mt-10 grid gap-6 overflow-hidden rounded-2xl md:grid-cols-[1fr_1.2fr]"
        style={{ background: `linear-gradient(135deg, ${HONEY}, ${HONEY_DEEP})` }}
      >
        <div className="flex items-center justify-center p-8">
          <img
            src={buzzyMascot.url}
            alt="Buzzy the mascot"
            className="max-h-80 w-auto drop-shadow-[0_20px_40px_rgba(13,27,51,0.25)]"
          />
        </div>
        <div className="flex flex-col justify-center p-8" style={{ color: NAVY }}>
          <div className="font-mono text-[11px] tracking-widest">HERO PORTRAIT</div>
          <div className="mt-2 text-4xl font-black">Buzzy</div>
          <p className="mt-3 text-sm leading-relaxed">
            The friendly face of NectarPay. Bright, warm, and endlessly
            encouraging. Use Buzzy to onboard, celebrate wins and turn empty
            states into little moments of delight.
          </p>
        </div>
      </div>

      {/* Expression sheet */}
      <h3 className="mt-14 font-mono text-xs tracking-[0.25em]" style={{ color: SLATE }}>
        EXPRESSION SHEET
      </h3>
      <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-9">
        {buzzy.map((b, i) => (
          <div
            key={i}
            className="flex flex-col items-center rounded-xl p-3"
            style={{ background: "#FEF6E1" }}
          >
            <img src={b.url} alt={expressions[i]} className="h-20 w-auto object-contain" />
            <div className="mt-2 text-[10px] font-semibold" style={{ color: HONEY_DEEP }}>
              {expressions[i]}
            </div>
          </div>
        ))}
      </div>

      {/* Model turnaround */}
      <h3 className="mt-14 font-mono text-xs tracking-[0.25em]" style={{ color: SLATE }}>
        MODEL TURNAROUND
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[buzzy1, buzzy3, buzzy5, buzzy7].map((b, i) => (
          <div
            key={i}
            className="flex h-48 items-center justify-center rounded-2xl"
            style={{ background: NAVY }}
          >
            <img src={b.url} alt="" className="max-h-36" />
          </div>
        ))}
      </div>

      {/* Personality quotes */}
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {[
          "Nice work — that's another zero-fee sale.",
          "You're all set. I'll buzz off and let you get to it.",
          "First payment landed. Sweet, right?",
        ].map((q) => (
          <div
            key={q}
            className="relative rounded-2xl p-5"
            style={{ background: "#FEF6E1", color: NAVY }}
          >
            <div
              className="absolute -left-2 top-4 h-4 w-4 rotate-45"
              style={{ background: "#FEF6E1" }}
            />
            <div className="text-sm">"{q}"</div>
            <div className="mt-3 flex items-center gap-2">
              <img src={buzzyMascot.url} alt="" className="h-8 w-8" />
              <span className="text-[11px] font-semibold" style={{ color: HONEY_DEEP }}>
                Buzzy
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl p-6" style={{ background: "#DCFCE7", color: "#065F46" }}>
          <div className="mb-3 font-mono text-xs tracking-widest">✓ DO</div>
          <ul className="space-y-2 text-sm">
            <li>✓ Use Buzzy to guide, reassure and celebrate</li>
            <li>✓ Keep motion gentle — a soft float or wing buzz</li>
            <li>✓ Give Buzzy room; respect clear space</li>
            <li>✓ Great for onboarding, empty states, education, swag</li>
          </ul>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "#FEE2E2", color: "#991B1B" }}>
          <div className="mb-3 font-mono text-xs tracking-widest">✕ DON'T</div>
          <ul className="space-y-2 text-sm">
            <li>✕ Don't put Buzzy near serious security or legal copy</li>
            <li>✕ Don't restretch, recolor or add sunglasses/props</li>
            <li>✕ Don't over-animate or make Buzzy the whole screen</li>
            <li>✕ Don't use in dense financial dashboards</li>
          </ul>
        </div>
      </div>

      <p className="mt-8 text-sm" style={{ color: SLATE }}>
        Professionalism balance — Buzzy is a delight, not a clown. Child-friendly
        and approachable, yet always tasteful enough to sit beside a Fortune-500
        logo. When trust is the message, let the brand lead and keep Buzzy in a
        supporting role.
      </p>
    </Section>
  );
}


/* ============================ 12 MOTION ============================ */

function MotionSection() {
  return (
    <Section id="motion" dark>
      <ChapterHeader num="12" kicker="MOTION DESIGN" />
      <H2>Motion with a purpose. Never for show.</H2>
      <Lede dark>
        Every animation confirms an action, guides attention, or expresses the
        ease of a payment. Quick, springy, honey-smooth — then out of the way.
      </Lede>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["fast", "120ms"],
          ["base", "200ms"],
          ["slow", "320ms"],
          ["ease-out", "cubic-bezier(.2,.8,.2,1)"],
          ["spring", "cubic-bezier(.34,1.56,.64,1)"],
          ["reduced-motion", "always ship a calm fallback"],
        ].map(([t, v]) => (
          <Card dark key={t}>
            <div className="font-mono text-xs" style={{ color: HONEY }}>{t}</div>
            <div className="mt-1 font-mono text-sm">{v}</div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ============================ 13 UI ============================ */

function UISection() {
  return (
    <Section id="ui">
      <ChapterHeader num="13" kicker="UI DESIGN LANGUAGE" />
      <H2>Calm, generous, and effortless to trust.</H2>
      <Lede>
        Soft surfaces, warm neutrals, honey used only where it counts. Big tap
        targets, clear hierarchy, and a numbers-first mindset — every screen
        answers "how much, and is it done?"
      </Lede>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card>
          <CardKicker>CORE COMPONENTS</CardKicker>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: HONEY, color: NAVY }}>
              Accept payment
            </button>
            <button className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: INK, color: INK }}>
              Secondary
            </button>
            <button className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ color: INK }}>
              Ghost
            </button>
            <button className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: "#E5484D", color: "#fff" }}>
              Danger
            </button>
          </div>
          <div className="mt-6 space-y-3">
            {[
              ["Settled", "#DCFCE7", "#065F46"],
              ["Pending", "#FEF3C7", "#92400E"],
              ["On-chain", "#DBEAFE", "#1E40AF"],
              ["Zero fee", "#FEF6E1", "#C56E08"],
            ].map(([l, bg, c]) => (
              <span
                key={l}
                className="mr-2 inline-block rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: bg, color: c }}
              >
                {l}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <div className="rounded-xl p-4" style={{ background: NAVY, color: COMB }}>
            <div className="font-mono text-[10px]" style={{ color: SLATE }}>
              app.nectarpay.com/dashboard
            </div>
            <div className="mt-3 text-lg font-bold">Good morning, Camille</div>
            <div className="text-xs" style={{ color: SLATE }}>Wildflower Café · Live · self-custody</div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <div className="text-[10px]" style={{ color: SLATE }}>Today's volume</div>
                <div className="text-xl font-black">$12,480</div>
                <div className="text-[10px]" style={{ color: HONEY }}>$0.00 in fees</div>
              </div>
              <div>
                <div className="text-[10px]" style={{ color: SLATE }}>Payments</div>
                <div className="text-xl font-black">217</div>
                <div className="text-[10px]" style={{ color: "#4ADE80" }}>▲ 18%</div>
              </div>
              <div>
                <div className="text-[10px]" style={{ color: SLATE }}>Avg settle</div>
                <div className="text-xl font-black">0.4s</div>
                <div className="text-[10px]" style={{ color: SLATE }}>instant</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ============================ 14 MARKETING ============================ */

function MarketingSection() {
  return (
    <Section id="marketing" dark>
      <ChapterHeader num="14" kicker="MARKETING STYLE" />
      <H2>Big idea. One number. Room to breathe.</H2>
      <Lede dark>
        Marketing leads with a single, honest promise — usually a number — set
        in Satoshi on navy or honey, with the hive close by. Generous space, no
        clutter, no hype.
      </Lede>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="flex aspect-video items-center justify-center rounded-2xl p-10" style={{ background: HONEY, color: NAVY }}>
          <div className="text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <img src={hiveMark.url} alt="" className="h-6 w-6" style={{ filter: "brightness(0)" }} />
              <span className="font-mono text-[10px] tracking-widest">NECTARPAY</span>
            </div>
            <div className="text-4xl font-black leading-none">Keep every<br/>cent you earn.</div>
            <div className="mt-4 text-xs">Accept crypto with zero fees. nectar-pay.com</div>
          </div>
        </div>
        <div className="flex aspect-video items-center justify-center rounded-2xl p-10" style={{ background: NAVY_2 }}>
          <div className="text-center">
            <div className="text-4xl font-black">Tap. Paid. Done.</div>
            <div className="mt-3 text-xs" style={{ color: SLATE }}>Terminal · inside the box</div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ============================ 15 SOCIAL ============================ */

function SocialSection() {
  return (
    <Section id="social">
      <ChapterHeader num="15" kicker="SOCIAL MEDIA" />
      <H2>Consistent hive. Native to every feed.</H2>
      <Lede>
        Same navy, honey and Satoshi everywhere — but the tone flexes to each
        platform. Every post is recognisable as NectarPay from the thumbnail
        alone.
      </Lede>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="aspect-square rounded-2xl p-8" style={{ background: NAVY, color: COMB }}>
          <div className="text-3xl font-black">0% fees.</div>
          <div className="text-3xl font-black" style={{ color: HONEY }}>100% yours.</div>
          <div className="mt-6 text-xs" style={{ color: SLATE }}>Instagram · 1:1</div>
        </div>
        <div className="aspect-[9/16] rounded-2xl p-6" style={{ background: HONEY, color: NAVY }}>
          <div className="text-2xl font-black">Tap to pay,<br/>anywhere</div>
          <div className="mt-4 rounded-full bg-navy px-3 py-1 text-xs font-semibold" style={{ background: NAVY, color: COMB, display: "inline-block" }}>Get started</div>
          <div className="mt-4 text-xs">Story · 9:16</div>
        </div>
        <div className="rounded-2xl p-6" style={{ background: COMB, color: INK }}>
          <div className="text-xs" style={{ color: SLATE }}>NectarPay · Promoted</div>
          <div className="mt-2 text-sm font-semibold">
            How Wildflower Café saved $4,200 last quarter — by switching to zero-fee crypto.
          </div>
          <div className="mt-4 text-xs" style={{ color: SLATE }}>LinkedIn</div>
        </div>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {[
          ["Instagram", "Warm, human, product beauty."],
          ["LinkedIn", "Credible merchant wins & data."],
          ["X", "Sharp, timely, a little witty."],
          ["YouTube", "Clear, patient education."],
          ["TikTok", "Fast, delightful, behind-the-counter."],
          ["Telegram", "Community, support, announcements."],
        ].map(([p, t]) => (
          <Card key={p}>
            <div className="font-bold">{p}</div>
            <div className="text-sm" style={{ color: SLATE }}>{t}</div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ============================ 16 SALES ============================ */

function SalesSection() {
  const rows = [
    ["Transaction fee", "$0", "2.9% + 30¢", "~1%"],
    ["Who holds funds", "You do", "The bank", "They do"],
    ["Settlement", "Instant", "2–7 days", "1–2 days"],
    ["Chargeback risk", "None", "High", "Some"],
    ["Assets supported", "BTC · TXC · stables+", "Cards only", "Limited"],
  ];
  return (
    <Section id="sales" dark>
      <ChapterHeader num="16" kicker="SALES MATERIALS" />
      <H2>Make the math impossible to ignore.</H2>
      <Lede dark>
        Sales tools are honest and concrete: real numbers, clear comparisons, no
        pressure. Let the zero-fee difference do the selling.
      </Lede>

      <div className="mt-10 overflow-x-auto rounded-2xl" style={{ background: NAVY_2 }}>
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)" }}>
              <th className="p-4 font-mono text-[11px] tracking-widest" style={{ color: SLATE }}></th>
              <th className="p-4 font-bold" style={{ color: HONEY }}>NectarPay</th>
              <th className="p-4" style={{ color: SLATE }}>Card processor</th>
              <th className="p-4" style={{ color: SLATE }}>Custodial gateway</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <td className="p-4 font-semibold">{r[0]}</td>
                <td className="p-4 font-semibold" style={{ color: HONEY }}>{r[1]}</td>
                <td className="p-4" style={{ color: "rgba(250,248,243,0.7)" }}>{r[2]}</td>
                <td className="p-4" style={{ color: "rgba(250,248,243,0.7)" }}>{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-2xl p-8 text-center" style={{ background: HONEY, color: NAVY }}>
        <div className="font-mono text-[11px] tracking-widest">ROI · $500K / YR MERCHANT</div>
        <div className="mt-2 text-5xl font-black">$14,500</div>
        <div className="mt-2 text-sm">saved annually vs 2.9% + 30¢</div>
      </div>
    </Section>
  );
}

/* ============================ 17 WEBSITE ============================ */

function WebsiteSection() {
  return (
    <Section id="website">
      <ChapterHeader num="17" kicker="WEBSITE GUIDELINES" />
      <H2>Fast, clear, and honest by default.</H2>
      <Lede>
        Every page leads with the promise, proves it with a number, and offers
        one obvious next step. Accessible to WCAG AA, sub-second loads,
        transparent pricing — no dark patterns, ever.
      </Lede>

      <div className="mt-10 overflow-hidden rounded-2xl border" style={{ borderColor: MIST }}>
        <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: MIST, background: MIST }}>
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="ml-4 font-mono text-[10px]" style={{ color: SLATE }}>nectar-pay.com</div>
        </div>
        <div className="bg-white p-10 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <img src={hiveMark.url} alt="" className="h-6 w-6" />
            <span className="font-black">NectarPay</span>
          </div>
          <h3 className="mt-6 text-4xl font-black" style={{ color: NAVY }}>
            Accept crypto.<br/>Keep every cent.
          </h3>
          <p className="mt-4 text-sm" style={{ color: SLATE }}>
            Zero fees. Non-custodial. Instant. Set up in two minutes.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <span className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: HONEY, color: NAVY }}>Create your account</span>
            <span className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: INK, color: INK }}>See a demo</span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {[
          ["Performance", "LCP < 1.2s · 90+ Lighthouse everywhere."],
          ["Accessibility", "WCAG 2.2 AA · keyboard & screen-reader first."],
          ["SEO", "Semantic, structured, honest metadata."],
          ["Docs & devs", "Copy-paste snippets, live examples, dark mode."],
        ].map(([t, d]) => (
          <Card key={t}>
            <div className="font-bold">{t}</div>
            <div className="mt-1 text-sm" style={{ color: SLATE }}>{d}</div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ============================ 18 TOKENS ============================ */

function TokensSection() {
  return (
    <Section id="tokens" dark>
      <ChapterHeader num="18" kicker="DEVELOPER BRAND TOKENS" />
      <H2>One source of truth. Copy, paste, ship.</H2>
      <Lede dark>
        The whole brand as design tokens — variables, scales and naming that
        stay identical from Figma to Tailwind to production.
      </Lede>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl p-6" style={{ background: "#0A1428" }}>
          <div className="mb-3 font-mono text-[11px]" style={{ color: SLATE }}>TOKENS.CSS</div>
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed" style={{ color: COMB }}>
{`:root {
  /* color */
  --np-honey-400:#F6A21E;
  --np-honey-500:#E8880C;
  --np-navy-900:#0D1B33;
  --np-comb:#FAF8F3;
  --np-success:#1E9E6A;
  --np-danger:#E5484D;
  /* radius */
  --np-r-sm:8px; --np-r-md:12px;
  --np-r-lg:20px; --np-r-pill:999px;
  /* space · 4pt */
  --np-2:8px; --np-3:12px; --np-4:16px;
  --np-6:24px; --np-8:32px; --np-12:48px;
  /* motion */
  --np-fast:120ms; --np-base:200ms;
  --np-ease:cubic-bezier(.2,.8,.2,1);
}`}
          </pre>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "#0A1428" }}>
          <div className="mb-3 font-mono text-[11px]" style={{ color: SLATE }}>TAILWIND.CONFIG.JS</div>
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed" style={{ color: COMB }}>
{`theme:{ extend:{
  colors:{
    honey:{400:'#F6A21E',500:'#E8880C'},
    navy:{900:'#0D1B33'},
    comb:'#FAF8F3',
  },
  borderRadius:{ np:'12px', 'np-lg':'20px' },
  fontFamily:{
    display:['Satoshi','sans-serif'],
    sans:['General Sans','sans-serif'],
    mono:['JetBrains Mono','monospace'],
  },
}}

// naming · np-[component]-[variant]
// np-btn-primary · np-card · np-badge-success`}
          </pre>
        </div>
      </div>
    </Section>
  );
}

/* ============================ 19 APPLICATIONS ============================ */

function ApplicationsSection() {
  const items = [
    "Payment terminal","Mobile app","Tablet checkout","Coffee mug","Polo & tees",
    "Canvas tote","Shipping box","Window decal","Vehicle wrap","Laptop sticker",
    "Trade show booth","Email signature",
  ];
  return (
    <Section id="applications">
      <ChapterHeader num="19" kicker="BRAND APPLICATIONS" />
      <H2>The hive, out in the world.</H2>
      <Lede>
        From the terminal on the counter to the van at the curb — one consistent,
        premium system that scales from a favicon to a billboard.
      </Lede>

      <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((name) => (
          <div key={name} className="overflow-hidden rounded-2xl" style={{ background: "#fff", border: `1px solid ${MIST}` }}>
            <div
              className="flex h-32 items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})` }}
            >
              <img src={hiveMark.url} alt="" className="h-10 w-10" />
            </div>
            <div className="p-3 text-sm font-semibold" style={{ color: INK }}>{name}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ============================ 20 TAGLINES ============================ */

function TaglinesSection() {
  const lines: Array<[string, number]> = [
    ["No fees. Trust the bees.", 95],
    ["Keep every cent.", 94],
    ["Your wallet. Your money.", 93],
    ["Accept crypto beautifully.", 91],
    ["Zero fees. All yours.", 89],
    ["Tap. Paid. Done.", 88],
    ["Get paid, keep it all.", 88],
    ["Money that stays yours.", 87],
    ["No middlemen. No fees. No wait.", 86],
    ["Keep more of what you make.", 86],
    ["Instant. Honest. Yours.", 85],
    ["Every sale, in full.", 84],
    ["Payments, sweetened.", 84],
    ["Settle instantly. Keep everything.", 84],
    ["The zero-fee standard.", 83],
    ["The friendliest way to accept crypto.", 83],
    ["Crypto that just works.", 82],
    ["The sweetest way to get paid.", 82],
    ["Made for merchants.", 81],
    ["Crypto, minus the catch.", 80],
    ["Where every payment lands.", 80],
    ["Own your checkout.", 79],
    ["Business runs sweeter here.", 79],
    ["Sweeten every transaction.", 78],
    ["Trust the hive.", 76],
    ["Where payments bloom.", 74],
    ["Honey-smooth payments.", 73],
    ["The hive for your money.", 72],
    ["Faster than a handshake.", 71],
    ["Pay it forward, fee-free.", 70],
    ["The Suite Spot™ for business.", 68],
    ["Bee your own bank.", 66],
    ["Nectar in, value out.", 64],
  ];
  return (
    <Section id="taglines" dark>
      <ChapterHeader num="20" kicker="TAGLINE EXPLORATION" />
      <H2>33 lines, scored. One dual winner.</H2>
      <Lede dark>
        Scored on ownability, clarity, honesty and warmth — and screened hard
        against hype and crypto-bro clichés. The strongest direction is a dual
        lockup: a warm, mascot-led hook backed by a plain trust anchor.
      </Lede>

      <div className="mt-10 rounded-2xl p-8" style={{ background: HONEY, color: NAVY }}>
        <div className="font-mono text-[11px] tracking-widest">RECOMMENDED — THE DUAL LOCKUP</div>
        <div className="mt-4 text-4xl font-black md:text-5xl">No fees. Trust the bees.</div>
        <div className="mt-2 text-3xl font-black md:text-4xl">Your wallet. Your money.</div>
        <p className="mt-4 max-w-2xl text-sm">
          A dual lockup that does two jobs at once: a warm, rhyming hook that
          leans on Buzzy — paired with a plain-spoken trust anchor. Lead with
          the hook in ads and social; let the anchor carry product, onboarding
          and anywhere trust matters most.
        </p>
      </div>

      <div className="mt-8 grid gap-2">
        {lines.map(([line, score], i) => (
          <div
            key={line}
            className="flex items-center gap-4 rounded-lg px-4 py-2"
            style={{ background: NAVY_2 }}
          >
            <div className="w-8 font-mono text-xs" style={{ color: SLATE }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="flex-1">{line}</div>
            <div className="font-mono text-sm font-bold" style={{ color: score >= 85 ? HONEY : SLATE }}>
              {score}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ============================ 21 MANIFESTO ============================ */

function ManifestoSection() {
  return (
    <Section id="manifesto">
      <ChapterHeader num="21" kicker="BRAND MANIFESTO" />
      <div className="mt-4">
        <h2 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
          The people who create value
          <br />
          <span style={{ color: HONEY_DEEP }}>
            should be the ones who keep it.
          </span>
        </h2>
      </div>

      <div className="mt-10 max-w-3xl space-y-6 text-lg leading-relaxed" style={{ color: INK }}>
        <p>
          We believe payments should be a bridge, not a toll booth. That your
          money is yours the instant you earn it — not in two to seven business
          days, and not minus a percentage.
        </p>
        <p>
          We build for the shopkeeper before the speculator. We choose clarity
          over cleverness, warmth over hype, and honesty over everything. We
          make the intimidating feel effortless, and we celebrate the people
          doing the work.
        </p>
        <p>
          We will never touch your funds. We will never hide a fee. We will
          never trade your trust for a headline, or mistake noise for progress.
          We are here to make accepting crypto the easiest, safest and smartest
          thing a business ever does.
        </p>
      </div>

      <div className="mt-14 flex items-center gap-4 border-t pt-8" style={{ borderColor: MIST }}>
        <img src={hiveMark.url} alt="" className="h-10 w-10" />
        <div>
          <div className="text-lg font-black">
            Nectar<span style={{ color: HONEY_DEEP }}>Pay</span>
          </div>
          <div className="text-sm" style={{ color: SLATE }}>
            No fees. Trust the bees.
          </div>
        </div>
      </div>

      <p className="mt-10 max-w-2xl text-sm" style={{ color: SLATE }}>
        This brand system is the single source of truth for every NectarPay
        experience. When in doubt, choose clarity, honesty and warmth.
      </p>
    </Section>
  );
}
