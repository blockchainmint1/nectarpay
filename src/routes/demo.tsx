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
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  PlayCircle,
  UserPlus,
  Wallet,
  Zap,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Watch the Demo · Nectar.Pay" },
      {
        name: "description",
        content:
          "See NectarPay in action — account setup, tap-to-pay crypto checkout, the velocity of money, and cashing out. Then book a live walkthrough or grab your Terminal Kit.",
      },
      { property: "og:title", content: "Nectar.Pay — Watch the Demo" },
      {
        property: "og:description",
        content:
          "Four short videos covering setup, checkout, velocity of money, and cash-out. Book a live demo or buy the Terminal Kit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoPage,
});

type VideoCard = {
  id: string;
  title: string;
  blurb: string;
  duration: string;
  icon: React.ComponentType<{ className?: string }>;
  src?: string; // when a URL is dropped in, the tile plays it.
};

const VIDEOS: VideoCard[] = [
  {
    id: "setup",
    title: "Setting up a new account",
    blurb: "From email to wallet-connected merchant in under 3 minutes.",
    duration: "~3 min",
    icon: UserPlus,
  },
  {
    id: "checkout",
    title: "Processing a crypto transaction",
    blurb: "Ring a sale, present the QR, and confirm settlement live.",
    duration: "~2 min",
    icon: Zap,
  },
  {
    id: "velocity",
    title: "The velocity of money",
    blurb: "Why keeping funds on-chain compounds — real merchant math.",
    duration: "~4 min",
    icon: RefreshCw,
  },
  {
    id: "cashout",
    title: "Cashing out to your bank",
    blurb: "Move crypto to USD when you want to, on your terms.",
    duration: "~3 min",
    icon: Wallet,
  },
];

function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <VideoGrid />
        <SeenEnough />
        <KitCta />
      </main>
      <MarketingFooter />
    </div>
  );
}

/* Hero -------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 60% at 30% 20%, color-mix(in oklab, var(--np-honey-400) 18%, transparent), transparent 60%), radial-gradient(50% 50% at 80% 80%, color-mix(in oklab, var(--np-honey-400) 10%, transparent), transparent 60%)",
        }}
      />
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 md:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
          <PlayCircle className="h-3.5 w-3.5" /> Watch the demo
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
          See NectarPay work — end to end, no sales script.
        </h1>
        <p className="max-w-2xl text-muted-foreground md:text-lg">
          Four short videos: account setup, live crypto checkout, the velocity of money, and
          cashing out. Watch on your own — or book a real human when you're ready.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild size="lg" className="gap-2">
            <a href="#book">
              Book a live demo <CalendarClock className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to="/checkout">
              Or buy the kit <Coins className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* Videos ------------------------------------------------------------ */

function VideoGrid() {
  return (
    <section className="border-b border-border py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              The whole flow, in four videos.
            </h2>
            <p className="mt-2 text-muted-foreground">
              Produced walkthroughs coming soon — pre-recorded by a working merchant.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Coming soon
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {VIDEOS.map((v, i) => (
            <VideoTile key={v.id} v={v} index={i + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function VideoTile({ v, index }: { v: VideoCard; index: number }) {
  const Icon = v.icon;
  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-card/60">
      <div className="relative aspect-video w-full overflow-hidden bg-[color:var(--np-ink-950,#0a0f1a)]">
        {v.src ? (
          <iframe
            src={v.src}
            title={v.title}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 40%, color-mix(in oklab, var(--np-honey-400) 22%, transparent), transparent 65%)",
            }}
          />
        )}
        {!v.src && (
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full border border-border/60 bg-background/60 p-4 backdrop-blur">
              <Icon className="h-8 w-8 text-[color:var(--np-honey-400)]" />
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Video {index} · Coming soon
            </div>
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {v.duration}
          </div>
          <h3 className="mt-1 text-lg font-semibold">{v.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{v.blurb}</p>
        </div>
      </div>
    </div>
  );
}

/* Kit CTA ----------------------------------------------------------- */

function KitCta() {
  return (
    <section className="border-b border-border py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 rounded-2xl border border-border bg-card/60 p-8 md:grid-cols-[1.1fr_1fr] md:p-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
              <Coins className="h-3.5 w-3.5" /> Terminal Kit
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Or skip the wait — buy the Terminal Kit now.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Everything you need to start accepting crypto at the point of sale. Ships in days,
              settles in seconds, and 100% of the sale lands in your wallet.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              {[
                "Tap-to-pay terminal + printer, pre-configured",
                "Wallet setup and chain onboarding",
                "First-year merchant fee included",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--np-honey-400)]" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-xl border border-border bg-background/60 p-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                One-time
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold">$499</span>
                <span className="text-sm text-muted-foreground">Terminal Kit</span>
              </div>
              <div className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
                First year
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold">$228</span>
                <span className="text-sm text-muted-foreground">merchant service</span>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Total today
                </div>
                <div className="mt-1 text-4xl font-bold">$727</div>
              </div>
            </div>
            <Button asChild size="lg" className="w-full gap-2">
              <Link to="/checkout">
                Buy the kit <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Booking form (borrowed from /onramp + phone field) ---------------- */

function SeenEnough() {
  const submit = useServerFn(submitLead);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    telegram: "",
    market: "Dallas / Fort Worth" as (typeof LEAD_MARKETS)[number],
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
        form.phone && `Phone: ${form.phone}`,
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
          source: "demo-page",
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
            <CalendarClock className="h-3.5 w-3.5" /> Seen enough?
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Book a live demo — 15 minutes, real humans.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tell us about your business and how you'd like to be reached. We'll confirm by phone,
            email, or Telegram and send a call link.
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
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  maxLength={40}
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
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
