// /home2 — DRAFT of the NectarPay v1 brand rollout homepage.
//
// Scoped-only: all colors, fonts, and utilities live on this route so nothing
// bleeds into the rest of the site until we're ready to promote.
// - Fonts loaded via head() links (Fontshare + Google)
// - Colors as CSS custom props on the root div
// - Uses semantic brand names (--np-honey, --np-navy) so promotion later is a
//   find-replace into src/styles.css @theme
//
// Reference: uploaded NectarPay_Brand_System.html — sections 01-21.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Zap, Shield, Wallet, Infinity as InfinityIcon, Check, X, Sparkles } from "lucide-react";
import { PosLaunchChooser } from "@/components/pos-launch-chooser";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NectarPay — Accept crypto. Keep every cent." },
      { name: "description", content: "The easiest, safest and smartest way to accept crypto payments. Zero fees, non-custodial, instant settlement. Set up in two minutes." },
      { property: "og:title", content: "NectarPay — Accept crypto. Keep every cent." },
      { property: "og:description", content: "0% fees. 100% yours. The non-custodial payment ecosystem for Bitcoin, TEXITcoin, stablecoins and every digital currency still to come." },
      { name: "theme-color", content: "#0D1B33" },
      { name: "robots", content: "noindex" }, // draft
    ],
    links: [
      { rel: "preconnect", href: "https://api.fontshare.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&f[]=general-sans@400,500,600&display=swap" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" },
    ],
  }),
  component: Home2,
});

/* ------------------------------------------------------------------ */
/* Brand tokens — mirror of docs §05 Color, §06 Typography, §12 Motion */
/* ------------------------------------------------------------------ */
const BRAND_STYLE = `
  .np {
    --np-honey-50:  #FEF6E1;
    --np-honey-100: #FDECC0;
    --np-honey-200: #FBD87E;
    --np-honey-300: #F9C33E;
    --np-honey-400: #F6A21E;
    --np-honey-500: #E8880C;
    --np-honey-600: #C56E08;

    --np-navy:  #0D1B33;
    --np-ink:   #2B3242;
    --np-slate: #6A7182;

    --np-white: #FFFFFF;
    --np-comb:  #FAF8F3;
    --np-mist:  #F3EEE2;
    --np-sand:  #EBE6DA;

    --np-success: #1E9E6A;
    --np-danger:  #E5484D;

    --np-display: "Satoshi", ui-sans-serif, system-ui, sans-serif;
    --np-body:    "General Sans", ui-sans-serif, system-ui, sans-serif;
    --np-mono:    "JetBrains Mono", ui-monospace, monospace;

    --np-ease-out: cubic-bezier(.2,.8,.2,1);
    --np-spring:   cubic-bezier(.34,1.56,.64,1);

    background: var(--np-navy);
    color: var(--np-white);
    font-family: var(--np-body);
    -webkit-font-smoothing: antialiased;
  }
  .np-display { font-family: var(--np-display); font-weight: 900; letter-spacing: -0.02em; }
  .np-h { font-family: var(--np-display); font-weight: 700; letter-spacing: -0.015em; }
  .np-mono { font-family: var(--np-mono); }
  .np-eyebrow {
    font-family: var(--np-mono);
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--np-honey-400);
  }
  .np-eyebrow-chip {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 12px; border-radius: 6px;
    border: 1px solid rgba(246,162,30,0.35);
    background: rgba(246,162,30,0.08);
    font-family: var(--np-mono);
    font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--np-honey-300);
  }
  .np-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 22px; border-radius: 10px;
    font-family: var(--np-body); font-weight: 600; font-size: 15px;
    transition: transform 200ms var(--np-spring), background 200ms var(--np-ease-out), box-shadow 200ms var(--np-ease-out);
  }
  .np-btn-honey { background: var(--np-honey-400); color: var(--np-navy); box-shadow: 0 10px 30px -12px rgba(246,162,30,0.55); }
  .np-btn-honey:hover { background: var(--np-honey-300); transform: translateY(-1px); }
  .np-btn-ghost { color: var(--np-white); border: 1px solid rgba(255,255,255,0.18); }
  .np-btn-ghost:hover { background: rgba(255,255,255,0.06); }

  /* Honeycomb background — SVG data URI, low-opacity */
  .np-hex {
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='56' height='64' viewBox='0 0 56 64'><path d='M28 1L54 16v32L28 63 2 48V16z' fill='none' stroke='%23F6A21E' stroke-width='1' stroke-opacity='0.09'/></svg>");
    background-repeat: repeat;
  }

  /* Card on cream */
  .np-card-cream { background: var(--np-white); border: 1px solid var(--np-sand); border-radius: 20px; }
  .np-card-navy  { background: var(--np-ink); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; }

  /* Hive mark idle float */
  @keyframes np-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  .np-float { animation: np-float 3.6s ease-in-out infinite; }

  /* Tap-to-pay pulse */
  @keyframes np-pulse { 0% { opacity: 0.9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.8); } }
  .np-pulse::before, .np-pulse::after {
    content: ""; position: absolute; inset: 0; border-radius: 50%;
    border: 2px solid var(--np-honey-400); animation: np-pulse 1.8s var(--np-ease-out) infinite;
  }
  .np-pulse::after { animation-delay: 0.9s; }
  @keyframes np-buzzy-float {
    0%, 100% { transform: translateY(0) rotate(-2deg); }
    50%      { transform: translateY(-14px) rotate(2deg); }
  }
  .np-buzzy-float { animation: np-buzzy-float 5.5s var(--np-ease-out) infinite; will-change: transform; }
  @media (prefers-reduced-motion: reduce) { .np-buzzy-float { animation: none; } }
`;

/* ------------------------------------------------------------------ */
/* The hive mark — from §04 Logo System, sourced from brand doc SVG    */
/* ------------------------------------------------------------------ */
function HiveMark({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 240 240" width={size} height={size} aria-hidden="true">
      <g transform="translate(0,15)" fill="var(--np-honey-400)">
        <path d="M198,171.2c-51.3-10-103.1-9.8-154.5-.8-5.1.9-9.4,2.8-11,8.1-1.3,4.3.3,8.9,3.2,12,2.9,2.9,7,4.7,11.9,3.8,47.7-8.1,95.3-8.4,143.7.1,8.2,0,14.1-5.6,14.2-13.3,0-3.9-3.1-9-7.5-9.9Z"/>
        <path d="M216.3,136.8c-44.4-9.2-89.6-12.6-134.7-8.5l-8.9.8c-.3,0-.6,0-.8,0-16.7,2-33.3,3.6-49.9,7.7-6.5,1.6-9.4,8.3-8.1,14.5,1,4.6,6.7,10.9,13,9.9,21.3-3.6,42.1-6.7,63.6-7.8,40.9-2,78.6-.2,119.2,7.7,4.6.9,9.1-2.4,11.2-5,3-3.8,4-8.4,2-12.9-1-2.3-3.7-5.8-6.7-6.4Z"/>
        <path d="M175.1,203.2c-37.5-6.3-75.2-6.4-112.7,0-4.4.8-7,5-5.1,9.7,2.1,5.2,9,11,15.5,10.2,30.9-4.1,61-5,92.4.3,7.5-.7,13.5-5,15.2-11.6,1.1-4.1-1.1-7.9-5.3-8.6Z"/>
        <path d="M54.8,116.5c-13.5-6.5-24.8-11.6-35.3-20.2-5.4-1.5-10.8.4-14.7,4.1-3.6,3.3-5.5,8.3-4.6,13.5,1.3,7.3,8.1,12.3,15.4,10,12.9-3.9,25.6-5.1,39.2-7.4Z"/>
        <path d="M24.4,74c16.8,14.5,36.6,24.7,58.2,30.3,46.3,11.9,95.2.8,130.9-30.8,4.2-3.7,2.8-10.4-.3-13.4-4.3-4-9.3-2.8-13.9,1-35.3,29.8-84.7,37.3-127,20.5-12.7-5-24-12.3-34.7-21-4.3-3.5-9.4-4.2-13.4-.5-3.6,3.3-4.4,10,.1,14Z"/>
        <path d="M232.1,99.8c-2.9-2.2-9.4-6.1-13.3-3.4-11.6,8-22.9,14.6-36.2,20.2,14.6,1.8,26.9,3.7,40.4,7.4,7.6,2.1,13.8-3.5,14.6-10.7.6-5.6-1.3-10.4-5.5-13.6Z"/>
        <path d="M48.1,43.3c40.9,34.5,100.5,34.8,141.3.1,4.1-3.5,5.4-9.1,1.6-13.7-3-3.5-8.8-4.2-13.4-.3-34.2,29-83.9,28.4-117.8-.4-4.2-3.5-10.2-2.8-13.2.6-3.9,4.6-2.5,10.1,1.6,13.6Z"/>
        <path d="M77.4,17c25.7,17.3,58.7,17.7,83.7-.6,4.5-3.3,5.5-9.1,2.5-13-3.3-4.3-8.6-4.3-13.2-1-19.4,13.9-45.2,13-64.1-.7-4.4-3.2-10.4-1.5-12.7,2.5-2.9,5-.6,9.9,3.8,12.8Z"/>
      </g>
    </svg>
  );
}

function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <span className="np-display inline-flex items-center" style={{ fontSize: size, letterSpacing: "-0.03em", lineHeight: 1 }}>
      <span style={{ color: "var(--np-white)" }}>Nectar</span>
      <span style={{ color: "var(--np-honey-400)" }}>Pay</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
function Home2() {
  // Live ticker for the hero mono strip
  const [t, setT] = useState(0.4);
  useEffect(() => {
    const id = setInterval(() => setT(0.3 + Math.random() * 0.3), 1400);
    return () => clearInterval(id);
  }, []);


  return (
    <>
    <PosLaunchChooser />
    <div className="np min-h-screen">

      <style dangerouslySetInnerHTML={{ __html: BRAND_STYLE }} />

      <MarketingNav />



      {/* ============ HERO ============ */}
      <section className="np-hex relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 md:pt-28">
          <div className="max-w-4xl">
            <div className="mb-8 flex items-center gap-3">
              <span className="np-eyebrow-chip">
                <Sparkles className="h-3 w-3" /> Non-custodial · Zero fees · v1.0
              </span>
            </div>

            <h1 className="np-display max-w-4xl text-[64px] leading-[0.98] md:text-[96px]">
              Accept crypto.<br />
              Keep <span style={{ color: "var(--np-honey-400)" }}>every cent.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg md:text-xl" style={{ color: "rgba(255,255,255,0.75)" }}>
              Zero fees. Non-custodial. Instant. Set up in two minutes.
              Bitcoin, TEXITcoin, stablecoins, and every digital currency still to come — settled straight into wallets you fully control.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/signup" className="np-btn np-btn-honey">
                Create your account <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#demo" className="np-btn np-btn-ghost">See a demo</a>
            </div>

            {/* Mono live ticker */}
            <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 np-mono text-xs" style={{ color: "var(--np-slate)" }}>
              <span>$0.00 FEES</span>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
              <span>SETTLED <span style={{ color: "var(--np-honey-300)" }}>{t.toFixed(2)}s</span></span>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
              <span>WALLET SELF-CUSTODY</span>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
              <span>WCAG AA</span>
            </div>
          </div>


          {/* Stat strip */}
          <div className="mt-16 grid grid-cols-2 gap-8 border-t pt-10 md:grid-cols-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <Stat n="0%" label="Transaction fees" />
            <Stat n="100%" label="Non-custodial" />
            <Stat n="~0.4s" label="Settlement" />
            <Stat n="∞" label="Future currencies" />
          </div>
        </div>

        {/* Hero glow */}
        <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(246,162,30,0.25), transparent 60%)" }} />
      </section>

      {/* ============ PROMISE / FEATURES ============ */}
      <section id="product" className="relative" style={{ background: "var(--np-comb)", color: "var(--np-navy)" }}>
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mb-3"><span className="np-eyebrow">02 · What you get</span></div>
          <h2 className="np-h max-w-3xl text-4xl leading-[1.05] md:text-6xl">
            Give economic control back to the people who create value.
          </h2>
          <p className="mt-6 max-w-2xl text-lg" style={{ color: "var(--np-slate)" }}>
            Payments should be a bridge, not a toll booth. Four promises — held to the number.
          </p>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Zero fees"
              body="No 2.9% + 30¢. No surcharge. Merchants keep the full sale — always."
              mono="$0.00 · every tap"
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Non-custodial"
              body="Your keys, your money. We never touch, freeze, or hold merchant funds."
              mono="0 · balances held"
            />
            <FeatureCard
              icon={<Wallet className="h-5 w-5" />}
              title="Instant settlement"
              body="Sub-second confirmation on Base and TEXITcoin. Chargebacks: impossible."
              mono="~0.4s · median"
            />
            <FeatureCard
              icon={<InfinityIcon className="h-5 w-5" />}
              title="Any currency, ever"
              body="BTC, TXC, USDC, ETH, SOL, TRX — plus the next standard the day it ships."
              mono="6+ · chains live"
            />
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="relative overflow-hidden">
        <div className="np-hex mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mb-3"><span className="np-eyebrow">03 · How it works</span></div>
          <h2 className="np-h max-w-3xl text-4xl leading-[1.05] md:text-6xl">
            Tap to pay, <span style={{ color: "var(--np-honey-400)" }}>anywhere.</span>
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <StepCard n="01" title="Create your account" body="Two minutes. No merchant approval, no underwriting. Bring your own wallet or make one on the way in." />
            <StepCard n="02" title="Point the terminal" body="Send a link, drop a QR, or hand a customer the Nectar POS. Amount in fiat, always." />
            <StepCard n="03" title="Customer taps. You're paid." body="The crypto lands in your wallet in under a second. We never sit in the middle." />
          </div>

          {/* Tap-to-pay illustration */}
          <div className="mt-16 flex justify-center">
            <div className="relative flex h-48 w-48 items-center justify-center">
              <div className="np-pulse absolute h-32 w-32" />
              <div className="np-float relative">
                <HiveMark size={96} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ COMPARE ============ */}
      <section id="compare" style={{ background: "var(--np-mist)", color: "var(--np-navy)" }}>
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mb-3"><span className="np-eyebrow">04 · The zero-fee difference</span></div>
          <h2 className="np-h max-w-3xl text-4xl leading-[1.05] md:text-6xl">
            Make the math impossible to ignore.
          </h2>
          <p className="mt-6 max-w-2xl text-lg" style={{ color: "var(--np-slate)" }}>
            No pressure. Real numbers. Let the difference do the selling.
          </p>

          <div className="mt-12 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--np-sand)", background: "var(--np-white)" }}>
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: "var(--np-navy)", color: "var(--np-white)" }}>
                  <th className="np-mono px-6 py-4 text-xs uppercase tracking-widest" style={{ color: "var(--np-slate)" }}>&nbsp;</th>
                  <th className="np-h px-6 py-4 text-sm" style={{ color: "var(--np-honey-400)" }}>NectarPay</th>
                  <th className="np-mono px-6 py-4 text-xs uppercase tracking-widest" style={{ color: "var(--np-slate)" }}>Card processor</th>
                  <th className="np-mono px-6 py-4 text-xs uppercase tracking-widest" style={{ color: "var(--np-slate)" }}>Custodial gateway</th>
                </tr>
              </thead>
              <tbody className="np-body">
                <CompareRow label="Transaction fee"      us="$0"        cards="2.9% + 30¢" cust="~1%" highlight />
                <CompareRow label="Who holds the funds"  us="You do"    cards="The bank"    cust="They do" highlight />
                <CompareRow label="Settlement"           us="Instant"   cards="2–7 days"    cust="1–2 days" highlight />
                <CompareRow label="Chargeback risk"      us="None"      cards="High"        cust="Some" highlight />
                <CompareRow label="Assets supported"     us="BTC · TXC · stables+" cards="Cards only" cust="Limited" />
              </tbody>
            </table>
          </div>

          {/* ROI callout */}
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="np-card-cream p-8">
              <div className="np-eyebrow" style={{ color: "var(--np-honey-500)" }}>ROI · $500k / yr merchant</div>
              <div className="np-display mt-3 text-5xl" style={{ color: "var(--np-honey-500)" }}>$14,500</div>
              <div className="mt-2 text-sm" style={{ color: "var(--np-slate)" }}>saved annually vs 2.9% + 30¢</div>
            </div>
            <div className="np-card-cream p-8">
              <div className="np-eyebrow" style={{ color: "var(--np-honey-500)" }}>Deposit velocity</div>
              <div className="np-display mt-3 text-5xl" style={{ color: "var(--np-navy)" }}>0.4s</div>
              <div className="mt-2 text-sm" style={{ color: "var(--np-slate)" }}>median settlement — vs 3 business days</div>
            </div>
            <div className="np-card-cream p-8">
              <div className="np-eyebrow" style={{ color: "var(--np-honey-500)" }}>Chargebacks</div>
              <div className="np-display mt-3 text-5xl" style={{ color: "var(--np-navy)" }}>0</div>
              <div className="mt-2 text-sm" style={{ color: "var(--np-slate)" }}>because we never held it in the first place</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ VOICE / QUOTES ============ */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mb-3"><span className="np-eyebrow">05 · How the brand speaks</span></div>
          <h2 className="np-h max-w-3xl text-4xl leading-[1.05] md:text-6xl">
            Confident. Helpful. Human. <span style={{ color: "var(--np-honey-400)" }}>Never crypto-bro.</span>
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <QuoteCard>You're all set — your first payment lands the moment your customer taps.</QuoteCard>
            <QuoteCard>No fees, no hold, no catch. That's just how NectarPay works.</QuoteCard>
            <QuoteCard>Your keys stay yours. We only make the moment simple.</QuoteCard>
          </div>
        </div>
      </section>

      {/* ============ DEVELOPERS ============ */}
      <section id="developers" className="relative" style={{ background: "var(--np-ink)" }}>
        <div className="np-hex mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-3"><span className="np-eyebrow">06 · Developers</span></div>
              <h2 className="np-h text-4xl leading-[1.05] md:text-5xl">
                Copy, paste, ship.
              </h2>
              <p className="mt-6 max-w-lg text-lg" style={{ color: "rgba(255,255,255,0.7)" }}>
                One drop-in script. WooCommerce & eCommerce plugins. Full REST API. Design tokens shared from Figma to production.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/docs" className="np-btn np-btn-honey">Read the docs</Link>
                <a href="https://texitcoin.org/build" target="_blank" rel="noreferrer" className="np-btn np-btn-ghost">
                  Build on TEXITcoin
                </a>
              </div>
            </div>

            <div className="np-card-navy overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <span className="np-mono text-xs" style={{ color: "var(--np-slate)" }}>index.html</span>
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--np-danger)" }} />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--np-honey-400)" }} />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--np-success)" }} />
                </div>
              </div>
              <pre className="np-mono overflow-x-auto p-6 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
{`<script src="https://nectar-pay.com/sdk.js"></script>

<button data-nectar-pay
        data-amount="19.00"
        data-currency="USD">
  Pay $19
</button>`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA BAND ============ */}
      <section id="start" className="relative overflow-hidden">
        <div className="np-hex mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
          <HiveMark size={72} />
          <h2 className="np-display mt-8 text-5xl md:text-7xl">
            Start in two minutes.
          </h2>
          <p className="mt-6 text-xl" style={{ color: "rgba(255,255,255,0.75)" }}>
            0% fees. 100% yours.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href="/signup" className="np-btn np-btn-honey">
              Create your account <ArrowRight className="h-4 w-4" />
            </a>
            <Link to="/pos" className="np-btn np-btn-ghost">Try the POS</Link>
          </div>
          <div className="pointer-events-none absolute inset-x-0 -bottom-40 mx-auto h-[500px] w-[900px] rounded-full" style={{ background: "radial-gradient(ellipse at center, rgba(246,162,30,0.18), transparent 60%)" }} />
        </div>
      </section>

      <MarketingFooter />

    </div>
    </>
  );
}


/* ------------------------------------------------------------------ */
/* Little pieces                                                        */
/* ------------------------------------------------------------------ */
function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="np-display text-4xl md:text-5xl" style={{ color: "var(--np-honey-400)" }}>{n}</div>
      <div className="mt-2 np-mono text-xs uppercase tracking-widest" style={{ color: "var(--np-slate)" }}>{label}</div>
    </div>
  );
}

function FeatureCard({ icon, title, body, mono }: { icon: React.ReactNode; title: string; body: string; mono: string }) {
  return (
    <div className="np-card-cream p-7 transition" style={{ transitionDuration: "200ms", transitionTimingFunction: "var(--np-ease-out)" }}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "var(--np-honey-100)", color: "var(--np-honey-500)" }}>
        {icon}
      </div>
      <h3 className="np-h mt-6 text-xl">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--np-slate)" }}>{body}</p>
      <div className="np-mono mt-6 text-xs uppercase tracking-widest" style={{ color: "var(--np-honey-500)" }}>{mono}</div>
    </div>
  );
}

function StepCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="np-card-navy p-7">
      <div className="np-mono text-xs" style={{ color: "var(--np-honey-400)" }}>{n}</div>
      <h3 className="np-h mt-4 text-2xl text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{body}</p>
    </div>
  );
}

function CompareRow({ label, us, cards, cust, highlight }: { label: string; us: string; cards: string; cust: string; highlight?: boolean }) {
  return (
    <tr style={{ borderTop: "1px solid var(--np-sand)" }}>
      <td className="px-6 py-5 text-sm font-medium" style={{ color: "var(--np-ink)" }}>{label}</td>
      <td className="px-6 py-5 text-base font-semibold" style={{ background: highlight ? "rgba(246,162,30,0.08)" : undefined, color: "var(--np-honey-500)" }}>{us}</td>
      <td className="px-6 py-5 text-sm" style={{ color: "var(--np-slate)" }}>
        <span className="inline-flex items-center gap-2"><X className="h-3.5 w-3.5" style={{ color: "var(--np-danger)" }} /> {cards}</span>
      </td>
      <td className="px-6 py-5 text-sm" style={{ color: "var(--np-slate)" }}>
        <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5" style={{ color: "var(--np-slate)" }} /> {cust}</span>
      </td>
    </tr>
  );
}

function QuoteCard({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="np-card-navy p-8">
      <div className="np-display text-3xl" style={{ color: "var(--np-honey-400)" }}>"</div>
      <p className="mt-2 text-lg leading-relaxed text-white">{children}</p>
    </blockquote>
  );
}

type FooterItem = { label: string; to?: string; href?: string; ext?: string };
function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <h4 className="np-mono text-xs uppercase tracking-widest" style={{ color: "var(--np-honey-400)" }}>{title}</h4>
      <ul className="mt-4 space-y-3 text-sm">
        {items.map((it) => (
          <li key={it.label}>
            {it.to ? (
              <Link to={it.to} className="hover:text-white" style={{ color: "rgba(255,255,255,0.65)" }}>{it.label}</Link>
            ) : it.ext ? (
              <a href={it.ext} target="_blank" rel="noreferrer" className="hover:text-white" style={{ color: "rgba(255,255,255,0.65)" }}>{it.label} ↗</a>
            ) : (
              <a href={it.href} className="hover:text-white" style={{ color: "rgba(255,255,255,0.65)" }}>{it.label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
