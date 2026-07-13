import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_MARKETS, submitLead } from "@/lib/leads.functions";
import {
  ArrowRight,
  CheckCircle2,
  CalendarClock,
  PlayCircle,
  ShieldCheck,
  Zap,
  Coins,
} from "lucide-react";

export const Route = createFileRoute("/onramp")({
  head: () => ({
    meta: [
      { title: "Nectar.Pay Onramp · Accept crypto in your store today" },
      {
        name: "description",
        content:
          "The merchant onramp for real-world crypto payments. Terminal Kit ships in days, settles in seconds, and keeps 100% of the sale in your wallet.",
      },
      { property: "og:title", content: "Nectar.Pay Onramp — Accept Crypto in Your Store" },
      {
        property: "og:description",
        content:
          "Pitch, demo video, live booking, and the Terminal Kit — everything you need to start accepting crypto at the point of sale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnrampPage,
});

const VIDEO_SRC =
  "https://streamtxc.com/embed/bafybeibr4yk5dojvbrhx7dlyqbtfnjlfsmihqpnagefjz7g6e7oqu3txau?";


function OnrampPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <VideoSection />
        <PitchSection />
        <KitSection />
        <BookingSection />
      </main>
      <MarketingFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                 */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 0%, color-mix(in oklab, var(--np-honey-400) 22%, transparent), transparent 60%), radial-gradient(50% 40% at 90% 20%, color-mix(in oklab, var(--np-honey-400) 12%, transparent), transparent 60%)",
        }}
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 md:grid-cols-[1.15fr_1fr] md:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
            <Zap className="h-3.5 w-3.5" /> Merchant onramp
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Accept crypto in your store.{" "}
            <span className="text-[color:var(--np-honey-400)]">Keep the whole sale.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Nectar.Pay is the point-of-sale layer for real-world crypto. Tap-to-pay
            terminal, printed receipt, live settlement — no chargebacks, no 3% haircut,
            no middleman touching your money.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <a href="#book">
                Book a live demo <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link to="/checkout">
                Claim your Terminal Kit <Coins className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <ul className="mt-10 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            {[
              "Settles in seconds on TEXITcoin & Omni L2",
              "Accepts BTC, TXC, and stables",
              "Ships in days — plug in and sell",
              "No monthly fee, no per-swipe cut",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--np-honey-400)]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="rounded-2xl border border-border bg-card/60 p-6 shadow-xl backdrop-blur">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Terminal Kit
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold">$499</span>
            <span className="text-sm text-muted-foreground">one-time</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Tangem-based tap terminal, thermal printer, POS app, and merchant wallet.
            Everything you need to start taking crypto at the counter.
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            {[
              "Tap-to-pay Tangem terminal",
              "Bluetooth receipt printer",
              "Nectar.Pay POS app + dashboard",
              "First-year merchant fee: $228 (optional)",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--np-honey-400)]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-6 w-full gap-2">
            <Link to="/checkout">
              Buy the kit <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Pay in BTC, TXC, or stablecoins · ships in 3–5 days
          </p>
        </aside>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Video                                                                */
/* ------------------------------------------------------------------ */

function VideoSection() {
  return (
    <section className="border-b border-border bg-muted/20 py-16 md:py-24">
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              See it in 90 seconds
            </h2>
            <p className="mt-2 text-muted-foreground">
              A live tap-to-pay checkout, from scan to receipt.
            </p>
          </div>
          <PlayCircle className="hidden h-10 w-10 text-[color:var(--np-honey-400)] md:block" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-2xl">
          <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
            <iframe
              src={VIDEO_SRC}
              title="Nectar.Pay onramp demo"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pitch                                                                */
/* ------------------------------------------------------------------ */

function PitchSection() {
  const points = [
    {
      icon: Coins,
      title: "You keep 100% of the sale",
      body: "Funds arrive in your merchant wallet on-chain. No processor holds them, no reserve, no rolling settlement.",
    },
    {
      icon: Zap,
      title: "Settles in seconds",
      body: "TEXITcoin and the Omni L2 confirm in seconds, not days. Customer taps, you print the receipt, sale done.",
    },
    {
      icon: ShieldCheck,
      title: "Zero chargebacks",
      body: "On-chain payments are final. Once it's confirmed, it's yours — no disputes, no clawbacks six months later.",
    },
    {
      icon: CalendarClock,
      title: "Live in days, not months",
      body: "Order the kit, book onboarding, and start ringing crypto sales this week. We handle setup end-to-end.",
    },
  ];
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-4">
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">
          The onramp your customers already asked for.
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Nectar.Pay is built for merchants who want to accept crypto at the counter
          without becoming a crypto company.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {points.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-border bg-card/50 p-6"
            >
              <p.icon className="h-6 w-6 text-[color:var(--np-honey-400)]" />
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Kit                                                                  */
/* ------------------------------------------------------------------ */

function KitSection() {
  return (
    <section className="border-y border-border bg-muted/20 py-16 md:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
            <Coins className="h-3.5 w-3.5" /> Terminal Kit · $499
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need on day one.
          </h2>
          <p className="mt-3 text-muted-foreground">
            One box, one price. Unbox it, pair it to your phone or tablet, and start
            taking tap-to-pay crypto in the next hour.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Tangem tap terminal (hardware-secured)",
              "Bluetooth thermal receipt printer",
              "Nectar.Pay POS app (iOS & Android)",
              "Merchant dashboard with live settlement feed",
              "Optional: first-year merchant fee $228",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--np-honey-400)]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/checkout">
                Claim your kit <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#book">Book a walkthrough first</a>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-8">
          <div className="flex items-baseline justify-between">
            <span className="text-sm uppercase tracking-wider text-muted-foreground">
              Total today
            </span>
            <span className="text-4xl font-bold">$499</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between text-sm text-muted-foreground">
            <span>+ optional first-year fee</span>
            <span>$228</span>
          </div>
          <div className="mt-6 h-px w-full bg-border" />
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-[color:var(--np-honey-400)]" />
              <span>Pay in BTC, TXC, or USD stablecoins</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-[color:var(--np-honey-400)]" />
              <span>Ships in 3–5 business days</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-[color:var(--np-honey-400)]" />
              <span>Onboarding call included</span>
            </div>
          </div>
          <Button asChild size="lg" className="mt-8 w-full gap-2">
            <Link to="/checkout">
              Checkout <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Booking / contact form                                               */
/* ------------------------------------------------------------------ */

function BookingSection() {
  const submit = useServerFn(submitLead);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    telegram: "",
    market: "Los Angeles" as (typeof LEAD_MARKETS)[number],
    business: "",
    preferredTime: "",
    message: "",
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const combined = [
        form.business && `Business: ${form.business}`,
        form.preferredTime && `Preferred demo time: ${form.preferredTime}`,
        form.message,
      ]
        .filter(Boolean)
        .join("\n\n");

      await submit({
        data: {
          name: form.name,
          email: form.email,
          telegram: form.telegram,
          market: form.market,
          interest: "Onramp demo",
          message: combined,
          source: "onramp-page",
        },
      });
      setSent(true);
      toast.success("Booked — we'll confirm your demo shortly.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="book" className="py-16 md:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 md:grid-cols-[1fr_1.15fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" /> Book a live demo
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            15 minutes. Real terminal. Real questions.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tell us about your business and when works. We'll confirm by email or
            Telegram and send a video link — no phone tag, no sales script.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            {[
              "Watch a real crypto tap-to-pay checkout",
              "Ask anything about fees, custody, or settlement",
              "Get a quote for multi-location rollout",
              "Learn about affiliate & sales-rep revenue share",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--np-honey-400)]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {sent ? (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card/60 p-10 text-center">
            <div>
              <CheckCircle2 className="mx-auto h-10 w-10 text-[color:var(--np-honey-400)]" />
              <p className="mt-4 text-lg font-semibold">You're on the calendar.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                We'll confirm your demo time within one business day.
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/checkout">Or grab your kit now →</Link>
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-2xl border border-border bg-card/60 p-6 md:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="business">Business name</Label>
                <Input
                  id="business"
                  maxLength={120}
                  placeholder="Optional"
                  value={form.business}
                  onChange={(e) => update("business", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="telegram">Telegram (optional)</Label>
                <Input
                  id="telegram"
                  maxLength={120}
                  placeholder="@yourhandle"
                  value={form.telegram}
                  onChange={(e) => update("telegram", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label>Market</Label>
                <Select
                  value={form.market}
                  onValueChange={(v) =>
                    update("market", v as (typeof LEAD_MARKETS)[number])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_MARKETS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="preferredTime">Preferred demo time</Label>
                <Input
                  id="preferredTime"
                  maxLength={200}
                  placeholder="e.g. Tue/Thu afternoons PT"
                  value={form.preferredTime}
                  onChange={(e) => update("preferredTime", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="message">Anything we should know? (optional)</Label>
              <Textarea
                id="message"
                rows={4}
                maxLength={1800}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder="Number of locations, current processor, questions…"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit" size="lg" disabled={sending} className="gap-2">
                {sending ? "Booking…" : "Book my demo"}
                {!sending && <ArrowRight className="h-4 w-4" />}
              </Button>
              <span className="text-xs text-muted-foreground">
                We reply within one business day.
              </span>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
