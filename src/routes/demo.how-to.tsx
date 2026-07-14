import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  UserPlus,
  Zap,
  RefreshCw,
  Wallet,
  Package,
  Power,
  KeyRound,
  Coins,
  Bell,
  Nfc,
  QrCode,
  Building2,
  Banknote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Route                                                              */
/* ------------------------------------------------------------------ */

const searchSchema = z.object({
  slide: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/demo/how-to")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "How-To Deck · NectarPay" },
      {
        name: "description",
        content:
          "A walk-through of NectarPay in slides — setup, tap-to-pay checkout, the velocity of money, and cashing out. Use ← → to move.",
      },
      { property: "og:title", content: "NectarPay — How-To Deck" },
      {
        property: "og:description",
        content:
          "Setup, checkout, velocity of money, cash-out — with real screenshots from the app.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowToDeck,
});

/* ------------------------------------------------------------------ */
/* Deck data                                                          */
/* ------------------------------------------------------------------ */

type Section = "setup" | "checkout" | "velocity" | "cashout";

type Slide =
  | {
      kind: "cover";
      section: Section;
      title: string;
      subtitle: string;
      kicker: string;
    }
  | {
      kind: "shot";
      section: Section;
      title: string;
      body: string;
      shot: string; // url in /how-to/*.png
      caption?: string;
      badge?: string;
      side?: "right" | "left";
    }
  | {
      kind: "callout";
      section: Section;
      title: string;
      body: string;
      icon: React.ComponentType<{ className?: string }>;
      accent?: string;
    }
  | {
      kind: "grid";
      section: Section;
      title: string;
      body?: string;
      items: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }[];
    };

const SECTIONS: Record<Section, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  setup:    { label: "Setting up",      icon: UserPlus },
  checkout: { label: "Processing a sale", icon: Zap },
  velocity: { label: "Velocity of money", icon: RefreshCw },
  cashout:  { label: "Cashing out",     icon: Wallet },
};

const SLIDES: Slide[] = [
  /* ── Section 1 ── Setup ────────────────────────────────────────── */
  {
    kind: "cover",
    section: "setup",
    kicker: "Chapter 01",
    title: "Setting up a new account.",
    subtitle: "From the box on your counter to your first invoice — under three minutes.",
  },
  {
    kind: "grid",
    section: "setup",
    title: "What comes in the box.",
    items: [
      { icon: Package, title: "POS terminal", body: "Pre-configured, ready to pair." },
      { icon: Power,   title: "Charger + stand", body: "Plug in, power on — that's it." },
      { icon: Sparkles, title: "Quick-start card", body: "One page, one QR to this deck." },
    ],
  },
  {
    kind: "callout",
    section: "setup",
    title: "Power on and open the NectarPay POS app.",
    body: "The device boots straight into the app. First launch shows the pairing screen you see next.",
    icon: Power,
  },
  {
    kind: "shot",
    section: "setup",
    title: "Pair your terminal.",
    body:
      "Sign in with your NectarPay account to auto-pair, or type the 6-character code from your dashboard. Scanning the QR works too.",
    shot: "/how-to/pos-pair.png",
    caption: "POS · Pair terminal",
    badge: "Step 1 of onboarding",
  },
  {
    kind: "shot",
    section: "setup",
    title: "Run the onboarding steps.",
    body:
      "Store name, currency, tax defaults. Accept the defaults if you're not sure — everything is editable later from Store settings.",
    shot: "/how-to/setup.png",
    caption: "Merchant onboarding",
    badge: "Defaults are safe",
  },
  {
    kind: "shot",
    section: "setup",
    title: "Set up your Beekeeper wallet.",
    body:
      "We generate a non-custodial wallet you fully own. Write down the 12-word seed and store it somewhere safe — NectarPay never sees it.",
    shot: "/how-to/docs-wallet.png",
    caption: "Wallet setup guide",
    badge: "Non-custodial · you hold the keys",
  },
  {
    kind: "shot",
    section: "setup",
    title: "Land on the POS transaction screen.",
    body:
      "Terminal paired, wallet ready. From here every tap of the app opens straight to the amount pad — you're ready to ring your first sale.",
    shot: "/how-to/pos-settings.png",
    caption: "Terminal · settings & home",
  },

  /* ── Section 2 ── Checkout ─────────────────────────────────────── */
  {
    kind: "cover",
    section: "checkout",
    kicker: "Chapter 02",
    title: "Processing a crypto transaction.",
    subtitle: "Ring the amount, present the QR, tap to pay. Confirmed in seconds — no card network in the middle.",
  },
  {
    kind: "callout",
    section: "checkout",
    title: "Type the amount.",
    body:
      "Enter the sale total on the amount pad. Currency defaults to your store's local currency; crypto conversion happens automatically at settlement.",
    icon: Coins,
  },
  {
    kind: "shot",
    section: "checkout",
    title: "Present the QR code.",
    body:
      "The screen flips to a large QR the customer scans with any crypto wallet — Beekeeper, Tangem, or any Web3 wallet they already use.",
    shot: "/how-to/docs-tangem.png",
    caption: "Tap-to-pay & QR guide",
    badge: "QR + NFC on the same screen",
  },
  {
    kind: "grid",
    section: "checkout",
    title: "Optional per-transaction extras.",
    body: "One row of toggles above the QR. Off by default — turn on only what your store needs.",
    items: [
      { icon: Coins,       title: "Tip",             body: "Preset % or custom amount." },
      { icon: KeyRound,    title: "Signature",       body: "Customer signs on-screen for larger tickets." },
      { icon: Bell,        title: "Email receipt",   body: "Customer enters email; PDF gets sent." },
      { icon: Package,     title: "Print receipt",   body: "If a printer is paired, one tap prints." },
    ],
  },
  {
    kind: "callout",
    section: "checkout",
    title: "Tap-to-pay with NFC.",
    body:
      "For customers with a Tangem card or NFC-enabled wallet, they simply tap the phone or card to the terminal. No QR scan needed.",
    icon: Nfc,
  },
  {
    kind: "callout",
    section: "checkout",
    title: "Confirmation, instantly.",
    body:
      "Within seconds the terminal beeps, prints the receipt, and your Beekeeper balance updates. A Telegram notification hits your phone the same moment.",
    icon: ShieldCheck,
    accent: "settled",
  },

  /* ── Section 3 ── Velocity ─────────────────────────────────────── */
  {
    kind: "cover",
    section: "velocity",
    kicker: "Chapter 03",
    title: "The velocity of money.",
    subtitle:
      "Card rails hold your money for days. Crypto settles in seconds — and that changes what you can do with it.",
  },
  {
    kind: "callout",
    section: "velocity",
    title: "The money is available. Right now.",
    body:
      "BTC, ETH, and USDC land in your wallet at settlement. There's no 2-3 day hold, no batch, no reserve. That's velocity #1.",
    icon: Zap,
  },
  {
    kind: "callout",
    section: "velocity",
    title: "Fight the reflex to cash out.",
    body:
      "First instinct is to hit 'Cash out'. Resist it. The dollars are still there whenever you want them — but a dollar that stays in-network buys something no bank statement can: local economic gravity.",
    icon: RefreshCw,
  },
  {
    kind: "grid",
    section: "velocity",
    title: "Spend it into your own market.",
    body:
      "Make a list of the businesses around you that could take crypto. Bring them on. Then trade with them.",
    items: [
      { icon: Building2, title: "Your suppliers", body: "Pay in USDC — same day, no wire fee." },
      { icon: Coins,     title: "Your neighbors", body: "The coffee shop, the mechanic, the printer next door." },
      { icon: Sparkles,  title: "Your customers", body: "Reward-them-back campaigns, on-chain, no processor." },
    ],
  },
  {
    kind: "callout",
    section: "velocity",
    title: "$100 spent 5 times is $500 of local GDP.",
    body:
      "That's the velocity of money. The faster it moves through a market, the more benefit it creates for everyone in it. Crypto rails make this measurable — and fast.",
    icon: RefreshCw,
    accent: "gdp",
  },

  /* ── Section 4 ── Cashout ─────────────────────────────────────── */
  {
    kind: "cover",
    section: "cashout",
    kicker: "Chapter 04",
    title: "Cashing out to your bank.",
    subtitle: "When you do want dollars in your bank account — here's the flow, end to end.",
  },
  {
    kind: "callout",
    section: "cashout",
    title: "Money arrives across wallets.",
    body:
      "Sales settle in different coins on different chains — BTC on Bitcoin, USDC on Base, and so on. Each has its own wallet.",
    icon: Wallet,
  },
  {
    kind: "callout",
    section: "cashout",
    title: "Round it up to your main wallet.",
    body:
      "Consolidate first: swap or bridge each balance into the main Beekeeper wallet. It may take a few transfers depending on how many chains you're touching.",
    icon: RefreshCw,
  },
  {
    kind: "shot",
    section: "cashout",
    title: "Hit Cash Out.",
    body:
      "Once everything is in one place, open the Cash-Out flow. You'll add your ACH routing and account numbers the first time (this rails feature is coming online now).",
    shot: "/how-to/cash-out.png",
    caption: "Cash-out",
    badge: "ACH · US bank",
  },
  {
    kind: "callout",
    section: "cashout",
    title: "A few hours to your bank.",
    body:
      "Standard ACH transfers usually land the same business day. You'll get a confirmation the moment funds arrive.",
    icon: Banknote,
    accent: "settled",
  },

  /* ── End card ── */
  {
    kind: "cover",
    section: "cashout",
    kicker: "That's the flow.",
    title: "Ready to see it live?",
    subtitle: "Book a 15-minute walkthrough with a real human, or grab a Terminal Kit and start today.",
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

function HowToDeck() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const total = SLIDES.length;
  const current = clamp(search.slide ?? 1, 1, total);
  const slide = SLIDES[current - 1];

  function go(n: number) {
    const next = clamp(n, 1, total);
    navigate({ search: (prev) => ({ ...prev, slide: next }), replace: true });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(current + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(current - 1); }
      else if (e.key === "Home") go(1);
      else if (e.key === "End") go(total);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    document.title = `${current}/${total} — ${slideTitle(slide)} · NectarPay How-To`;
  }, [current, total, slide]);

  const sectionSlides = useMemo(() => {
    const groups: Record<Section, number[]> = { setup: [], checkout: [], velocity: [], cashout: [] };
    SLIDES.forEach((s, i) => groups[s.section].push(i + 1));
    return groups;
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--np-ink-950,#0a0f1a)] text-white">
      <TopBar current={current} total={total} slide={slide} />

      <SlideStage>
        <SlideView slide={slide} />
      </SlideStage>

      <BottomBar
        current={current}
        total={total}
        onPrev={() => go(current - 1)}
        onNext={() => go(current + 1)}
        sectionSlides={sectionSlides}
        goSlide={go}
      />
    </div>
  );
}

function slideTitle(s: Slide): string {
  return "title" in s ? s.title : "Slide";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ------------------------------------------------------------------ */
/* Chrome                                                             */
/* ------------------------------------------------------------------ */

function TopBar({ current, total, slide }: { current: number; total: number; slide: Slide }) {
  const section = SECTIONS[slide.section];
  const SectionIcon = section.icon;
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link
          to="/demo"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-wider text-white/80 hover:bg-white/10"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to demo
        </Link>

        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-wider text-white/80">
            <SectionIcon className="h-3.5 w-3.5" /> {section.label}
          </span>
          <span className="text-xs tabular-nums text-white/60">
            Slide {current} / {total}
          </span>
        </div>
      </div>
    </header>
  );
}

function BottomBar({
  current,
  total,
  onPrev,
  onNext,
  sectionSlides,
  goSlide,
}: {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  sectionSlides: Record<Section, number[]>;
  goSlide: (n: number) => void;
}) {
  return (
    <footer className="sticky bottom-0 z-20 border-t border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(SECTIONS) as Section[]).map((key) => {
            const s = SECTIONS[key];
            const Icon = s.icon;
            const range = sectionSlides[key];
            const first = range[0] ?? 1;
            const active = SLIDES[current - 1].section === key;
            return (
              <button
                key={key}
                onClick={() => goSlide(first)}
                className={
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs uppercase tracking-wider transition " +
                  (active
                    ? "border-[color:var(--np-honey-400)] bg-[color:var(--np-honey-400)]/10 text-[color:var(--np-honey-400)]"
                    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10")
                }
              >
                <Icon className="h-3.5 w-3.5" /> {s.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={current === 1}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-wider text-white/80 hover:bg-white/10 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <button
            onClick={onNext}
            disabled={current === total}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-[color:var(--np-honey-400)]/15 px-3 py-1.5 text-xs uppercase tracking-wider text-[color:var(--np-honey-400)] hover:bg-[color:var(--np-honey-400)]/25 disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Scaled slide stage — fixed 1920x1080 that shrinks to fit           */
/* ------------------------------------------------------------------ */

const SLIDE_W = 1920;
const SLIDE_H = 1080;

function SlideStage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function fit() {
      const el = ref.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = Math.min(w / SLIDE_W, h / SLIDE_H);
      setScale(s > 0 ? s : 1);
    }
    fit();
    const ro = new ResizeObserver(fit);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return (
    <main ref={ref} className="relative flex-1 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 20%, color-mix(in oklab, var(--np-honey-400) 12%, transparent), transparent 60%), radial-gradient(50% 50% at 85% 80%, color-mix(in oklab, var(--np-honey-400) 8%, transparent), transparent 60%)",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: SLIDE_W,
          height: SLIDE_H,
          marginLeft: -SLIDE_W / 2,
          marginTop: -SLIDE_H / 2,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Slide typography + variants                                        */
/* ------------------------------------------------------------------ */

function SlideFrame({ children, kicker }: { children: React.ReactNode; kicker?: string }) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-[#101725] via-[#0b1220] to-[#0a0f1a] p-20 shadow-2xl">
      {kicker && (
        <div className="mb-8 inline-flex items-center gap-3 text-[22px] uppercase tracking-[0.2em] text-[color:var(--np-honey-400)]">
          <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--np-honey-400)]" />
          {kicker}
        </div>
      )}
      {children}
      <div className="pointer-events-none absolute bottom-8 left-20 flex items-center gap-2 text-[20px] uppercase tracking-widest text-white/40">
        <PlayCircle className="h-5 w-5" /> nectar-pay.com/demo/how-to
      </div>
    </div>
  );
}

function SlideView({ slide }: { slide: Slide }) {
  switch (slide.kind) {
    case "cover":       return <CoverSlide slide={slide} />;
    case "shot":        return <ShotSlide slide={slide} />;
    case "callout":     return <CalloutSlide slide={slide} />;
    case "grid":        return <GridSlide slide={slide} />;
  }
}

function CoverSlide({ slide }: { slide: Extract<Slide, { kind: "cover" }> }) {
  const S = SECTIONS[slide.section];
  const Icon = S.icon;
  return (
    <SlideFrame kicker={slide.kicker}>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-10 inline-flex w-fit items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-[28px] text-white/80">
          <Icon className="h-8 w-8 text-[color:var(--np-honey-400)]" /> {S.label}
        </div>
        <h1 className="max-w-[1400px] text-[104px] font-bold leading-[1.02] tracking-[-0.04em] text-white">
          {slide.title}
        </h1>
        <p className="mt-10 max-w-[1200px] text-[40px] leading-[1.2] text-white/70">
          {slide.subtitle}
        </p>
      </div>
    </SlideFrame>
  );
}

function ShotSlide({ slide }: { slide: Extract<Slide, { kind: "shot" }> }) {
  const S = SECTIONS[slide.section];
  const shotOnLeft = slide.side === "left";
  return (
    <SlideFrame kicker={S.label}>
      <div className={"grid flex-1 items-center gap-16 " + (shotOnLeft ? "grid-cols-[1fr_1fr]" : "grid-cols-[1fr_1fr]")}>
        {shotOnLeft && <ShotFrame slide={slide} />}
        <div>
          {slide.badge && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--np-honey-400)]/40 bg-[color:var(--np-honey-400)]/10 px-4 py-2 text-[20px] uppercase tracking-widest text-[color:var(--np-honey-400)]">
              {slide.badge}
            </div>
          )}
          <h2 className="text-[80px] font-bold leading-[1.05] tracking-[-0.03em] text-white">
            {slide.title}
          </h2>
          <p className="mt-8 max-w-[820px] text-[36px] leading-[1.28] text-white/75">
            {slide.body}
          </p>
        </div>
        {!shotOnLeft && <ShotFrame slide={slide} />}
      </div>
    </SlideFrame>
  );
}

function ShotFrame({ slide }: { slide: Extract<Slide, { kind: "shot" }> }) {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-5 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
          <span className="h-3 w-3 rounded-full bg-green-500/70" />
          {slide.caption && (
            <span className="ml-4 text-[20px] text-white/60">{slide.caption}</span>
          )}
        </div>
        <img
          src={slide.shot}
          alt={slide.caption ?? slide.title}
          className="block h-[720px] w-full object-cover object-top"
          loading="lazy"
        />
      </div>
    </div>
  );
}

function CalloutSlide({ slide }: { slide: Extract<Slide, { kind: "callout" }> }) {
  const S = SECTIONS[slide.section];
  const Icon = slide.icon;
  return (
    <SlideFrame kicker={S.label}>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-12 inline-flex h-32 w-32 items-center justify-center rounded-3xl border border-[color:var(--np-honey-400)]/40 bg-[color:var(--np-honey-400)]/10">
          <Icon className="h-16 w-16 text-[color:var(--np-honey-400)]" />
        </div>
        <h2 className="max-w-[1500px] text-[96px] font-bold leading-[1.03] tracking-[-0.035em] text-white">
          {slide.title}
        </h2>
        <p className="mt-10 max-w-[1300px] text-[40px] leading-[1.22] text-white/75">
          {slide.body}
        </p>
      </div>
    </SlideFrame>
  );
}

function GridSlide({ slide }: { slide: Extract<Slide, { kind: "grid" }> }) {
  const S = SECTIONS[slide.section];
  const cols = Math.min(slide.items.length, 4);
  return (
    <SlideFrame kicker={S.label}>
      <div className="flex flex-1 flex-col">
        <h2 className="text-[80px] font-bold leading-[1.05] tracking-[-0.03em] text-white">
          {slide.title}
        </h2>
        {slide.body && (
          <p className="mt-6 max-w-[1400px] text-[36px] leading-[1.25] text-white/70">
            {slide.body}
          </p>
        )}
        <div className={"mt-14 grid flex-1 gap-8 grid-cols-" + cols} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {slide.items.map((it) => {
            const Icon = it.icon;
            return (
              <div
                key={it.title}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-8"
              >
                <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:var(--np-honey-400)]/40 bg-[color:var(--np-honey-400)]/10">
                  <Icon className="h-8 w-8 text-[color:var(--np-honey-400)]" />
                </div>
                <div className="text-[36px] font-semibold leading-tight text-white">
                  {it.title}
                </div>
                <div className="mt-3 text-[26px] leading-[1.28] text-white/70">
                  {it.body}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SlideFrame>
  );
}

/* Unused imports (kept for future slide variants) — prevent tree-shake warnings */
void QrCode;
void ArrowRight;
