import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  PackageOpen,
  Smartphone,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";


export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Get started · Nectar.Pay" },
      {
        name: "description",
        content:
          "Take crypto payments in person or online. Non-custodial — funds settle straight to your wallet. Zero per-transaction fees.",
      },
          { property: "og:url", content: "https://nectar-pay.com/signup" },
],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/signup" }],
  }),
  component: SignupPage,
});

type Step = "welcome" | "business" | "listing" | "wallet" | "terminal" | "done";

const ORDER: Step[] = ["welcome", "business", "listing", "wallet", "terminal", "done"];

function SignupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [storeId, setStoreId] = useState<string | null>(null);

  // When signed in, find or create their first store and skip to business step.
  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const { data: stores } = await supabase
        .from("stores")
        .select("id, business_country, business_city, listing_visibility")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      const store = stores?.[0];
      if (store) {
        setStoreId(store.id);
        setStep((s) => (s === "welcome" ? "business" : s));
      } else {
        setStep((s) => (s === "welcome" ? "business" : s));
      }
    })();
  }, [loading, user]);

  const progress = useMemo(() => {
    const idx = ORDER.indexOf(step);
    return Math.round(((idx + 1) / ORDER.length) * 100);
  }, [step]);

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Get started with Nectar.Pay</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {step === "welcome" && <WelcomeStep onNext={() => setStep("business")} signedIn={!!user} />}
        {step === "business" && (
          <BusinessStep
            storeId={storeId}
            setStoreId={setStoreId}
            onNext={() => setStep("listing")}
          />
        )}
        {step === "listing" && storeId && (
          <ListingStep
            storeId={storeId}
            onNext={() => setStep("wallet")}
            onSkip={() => setStep("wallet")}
          />
        )}
        {step === "wallet" && storeId && (
          <WalletStep
            storeId={storeId}
            onNext={() => setStep("terminal")}
          />
        )}
        {step === "terminal" && storeId && (
          <TerminalStep
            storeId={storeId}
            onNext={() => setStep("done")}
          />
        )}
        {step === "done" && storeId && (
          <DoneStep
            storeId={storeId}
            onDashboard={() => navigate({ to: "/stores/$storeId", params: { storeId } })}
          />
        )}
      </div>

      <MarketingFooter />
    </div>
  );
}

function StepCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-6 md:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function WelcomeStep({ onNext, signedIn }: { onNext: () => void; signedIn: boolean }) {
  return (
    <StepCard
      title="Accept crypto at your business."
      desc="Non-custodial. Zero per-transaction fees. Set up in about 5 minutes."
    >
      <ul className="space-y-3 text-sm">
        {[
          "Sign in with your TXC wallet (your wallet IS your account).",
          "Tell us a bit about your business so we can list you on the map.",
          "Link a wallet — we'll auto-enable USDC, USDT and PYUSD.",
          "Pair the terminal you ordered, or skip and use any tablet.",
        ].map((line) => (
          <li key={line} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        {signedIn ? (
          <Button onClick={onNext} size="lg">
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link to="/auth" search={{ redirect: "/signup" }}>
              Sign in with TXC wallet <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost">
          <a href="https://beekeeper.honest.money" target="_blank" rel="noreferrer">
            Need a wallet? <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </StepCard>
  );
}

function BusinessStep({
  storeId,
  setStoreId,
  onNext,
}: {
  storeId: string | null;
  setStoreId: (id: string) => void;
  onNext: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    void (async () => {
      const { data } = await supabase
        .from("stores")
        .select("name, website, fiat_currency")
        .eq("id", storeId)
        .maybeSingle();
      if (data) {
        setName(data.name ?? "");
        setWebsite(data.website ?? "");
        setCurrency(data.fiat_currency ?? "USD");
      }
    })();
  }, [storeId]);

  async function handleSave() {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      if (storeId) {
        await supabase
          .from("stores")
          .update({
            name: name.trim(),
            website: website.trim() || null,
            fiat_currency: currency,
          })
          .eq("id", storeId);
      } else {
        const { data, error } = await supabase
          .from("stores")
          .insert({
            owner_id: user.id,
            name: name.trim(),
            website: website.trim() || null,
            fiat_currency: currency,
          })
          .select("id")
          .single();
        if (error) throw error;
        setStoreId(data.id);
      }
      onNext();
    } finally {
      setSaving(false);
    }
  }

  return (
    <StepCard
      title="Tell us about your business"
      desc="You can change any of this later in your store settings."
    >
      <div className="space-y-4">
        <Field label="Business name" required>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Honey Bee BBQ"
          />
        </Field>
        <Field label="Website (optional)">
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://honeybeebbq.com"
          />
        </Field>
        <Field label="Display currency">
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {["USD", "EUR", "GBP", "CAD", "AUD", "MXN"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </StepCard>
  );
}

function ListingStep({
  storeId,
  onNext,
  onSkip,
}: {
  storeId: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [visibility, setVisibility] = useState<"hidden" | "city_only" | "full">(
    "city_only",
  );
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await supabase
        .from("stores")
        .update({
          listing_visibility: visibility,
          business_category: category || null,
          business_city: city || null,
          business_country: country || null,
        })
        .eq("id", storeId);
      onNext();
    } finally {
      setSaving(false);
    }
  }

  return (
    <StepCard
      title="Get found on the map"
      desc="Nectar.Pay maintains a public 'where to spend crypto' directory at /where. Choose how you want to appear."
    >
      <div className="space-y-3">
        {[
          {
            v: "city_only" as const,
            title: "City pin only (recommended)",
            desc: "Anonymous category pin near your city. Customers can find you without seeing your name or address.",
          },
          {
            v: "full" as const,
            title: "Full listing",
            desc: "Show your name, address, logo and website on the map. Best for storefronts.",
          },
          {
            v: "hidden" as const,
            title: "Hidden",
            desc: "Don't appear on the public map.",
          },
        ].map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => setVisibility(opt.v)}
            className={`w-full rounded-lg border p-4 text-left transition ${
              visibility === opt.v
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent/40"
            }`}
          >
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="text-sm font-medium">{opt.title}</div>
                <div className="text-xs text-muted-foreground">{opt.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {visibility !== "hidden" && (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Field label="Category">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select…</option>
              {[
                "Restaurant",
                "Bar",
                "Cafe",
                "Retail",
                "Grocery",
                "Services",
                "Online",
                "Other",
              ].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="City">
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Austin"
            />
          </Field>
          <Field label="Country">
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="United States"
            />
          </Field>
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </StepCard>
  );
}

function WalletStep({
  storeId,
  onNext,
}: {
  storeId: string;
  onNext: () => void;
}) {
  return (
    <StepCard
      title="Link your wallet"
      desc="Funds settle directly to your wallet — we never touch them. Beekeeper.money is the recommended companion wallet."
    >
      <div className="space-y-3">
        <a
          href={`/stores/${storeId}/chains`}
          className="block rounded-lg border border-border bg-background p-4 transition hover:border-primary hover:bg-accent/40"
        >
          <div className="flex items-start gap-3">
            <Wallet className="mt-1 h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Link a Beekeeper.money wallet</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Scan a QR with your wallet to securely share an xpub for every
                chain. Takes ~10 seconds.
              </p>
            </div>
          </div>
        </a>
        <a
          href={`/stores/${storeId}/chains`}
          className="block rounded-lg border border-border bg-background p-4 transition hover:border-primary hover:bg-accent/40"
        >
          <div className="flex items-start gap-3">
            <Globe className="mt-1 h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">I have my own xpub / address</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Paste an xpub or single receive address per chain — works with
                any wallet.
              </p>
            </div>
          </div>
        </a>
        <a
          href="https://beekeeper.honest.money"
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg border border-dashed border-border bg-background p-4 transition hover:border-primary hover:bg-accent/40"
        >
          <div className="flex items-start gap-3">
            <ExternalLink className="mt-1 h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">I need a wallet first</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Download Beekeeper, then come back to finish setup.
              </p>
            </div>
          </div>
        </a>
      </div>
      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onNext}>
          I&apos;ll do this later
        </Button>
        <Button onClick={onNext}>
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </StepCard>
  );
}

function TerminalStep({
  storeId,
  onNext,
}: {
  storeId: string;
  onNext: () => void;
}) {
  const { user } = useAuth();
  return (
    <StepCard
      title="Get a terminal"
      desc="Take payments in person. Nectar.Pay terminals are pre-paired Android POS devices — order one or pair an existing device."
    >
      <div className="space-y-3">
        <a
          href={`https://blockchainmint.com/?ref=nectarpay&account=${user?.id ?? ""}&store=${storeId}`}
          target="_blank"
          rel="noreferrer"
          onClick={async () => {
            if (!user) return;
            await supabase
              .from("profiles")
              .update({ terminal_order_clicked_at: new Date().toISOString() })
              .eq("user_id", user.id);
          }}
          className="block rounded-lg border-2 border-primary bg-primary/5 p-4 transition hover:bg-primary/10"
        >
          <div className="flex items-start gap-3">
            <PackageOpen className="mt-1 h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="font-medium">Order a terminal from BlockchainMint</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pre-configured, ships ready to use. ~$199 one-time. We&apos;ll
                pre-fill your account so it pairs automatically on first boot.
              </p>
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                Open BlockchainMint <ExternalLink className="h-3 w-3" />
              </div>
            </div>
          </div>
        </a>
        <a
          href={`/stores/${storeId}/terminals`}
          className="block rounded-lg border border-border bg-background p-4 transition hover:border-primary hover:bg-accent/40"
        >
          <div className="flex items-start gap-3">
            <Smartphone className="mt-1 h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">I already have a terminal</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pair an existing Android POS or any tablet to your store.
              </p>
            </div>
          </div>
        </a>
      </div>
      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onNext}>
          Skip — I&apos;ll use BYO POS
        </Button>
        <Button onClick={onNext}>
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </StepCard>
  );
}

function DoneStep({
  storeId,
  onDashboard,
}: {
  storeId: string;
  onDashboard: () => void;
}) {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .update({
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: "done",
      })
      .eq("user_id", user.id);
  }, [user]);

  return (
    <StepCard
      title="You're set up."
      desc="Welcome to honest money. Here are a few things to try next."
    >
      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
          <span>Issue a $1 test invoice from your dashboard.</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
          <span>Install the WooCommerce plugin if you sell online.</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
          <span>
            Check <Link to="/where" className="text-primary hover:underline">/where</Link>
            {" "}— your city pin should appear within a few minutes of your
            first terminal heartbeat.
          </span>
        </li>
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={onDashboard}>
          Go to store dashboard <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link to="/docs">Read the docs</Link>
        </Button>
      </div>
    </StepCard>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}
