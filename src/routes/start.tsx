import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ExternalLink, Mail, Smartphone, Wallet } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { NectarMark } from "@/components/marketing-shell";
import { createWalletLinkCode } from "@/lib/wallet-link.functions";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start accepting crypto · Nectar.Pay" },
      {
        name: "description",
        content:
          "Mobile-first onboarding. Sign in with your wallet, name your business, link a wallet, done. About 90 seconds.",
      },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    ],
  }),
  component: StartPage,
});

type Step = "welcome" | "business" | "wallet" | "done";

function StartPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [storeId, setStoreId] = useState<string | null>(null);

  // Once signed in, find their first store (or stay ready to create one).
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setStep("welcome");
      return;
    }
    void (async () => {
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      const s = stores?.[0];
      if (s?.id) {
        setStoreId(s.id);
        setStep((cur) => (cur === "welcome" ? (s.name ? "wallet" : "business") : cur));
      } else {
        setStep((cur) => (cur === "welcome" ? "business" : cur));
      }
    })();
  }, [loading, user]);

  const stepIdx = ["welcome", "business", "wallet", "done"].indexOf(step);
  const progress = Math.round(((stepIdx + 1) / 4) * 100);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="flex items-center justify-between px-5 pt-5">
        <Link to="/" className="flex items-center gap-2">
          <NectarMark className="h-7 w-7" />
          <span className="text-sm font-semibold tracking-tight">Nectar.Pay</span>
        </Link>
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Step {Math.max(1, stepIdx + 1)} / 4
        </span>
      </header>

      <div className="px-5 pt-3">
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-6">
        {step === "welcome" && <Welcome signedIn={!!user} />}
        {step === "business" && user && (
          <Business
            userId={user.id}
            storeId={storeId}
            onCreated={(id) => {
              setStoreId(id);
              setStep("wallet");
            }}
          />
        )}
        {step === "wallet" && storeId && (
          <WalletLink storeId={storeId} onDone={() => setStep("done")} />
        )}
        {step === "done" && storeId && (
          <Done
            storeId={storeId}
            onDashboard={() => navigate({ to: "/stores/$storeId", params: { storeId } })}
          />
        )}
      </main>
    </div>
  );
}

/* ---------------- Welcome ---------------- */

function Welcome({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">
        <p className="text-[11px] uppercase tracking-[0.35em] text-primary">90-second setup</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">
          Start accepting crypto today.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Non-custodial. Zero per-transaction fees. Your wallet IS your account — no email,
          no password.
        </p>

        <ul className="mt-8 space-y-3 text-sm">
          {[
            "Sign in with your TXC wallet",
            "Name your business",
            "Link a wallet to receive funds",
            "Take your first payment",
          ].map((line, i) => (
            <li key={line} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                {i + 1}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sticky bottom-0 mt-8 space-y-2 bg-background pb-[env(safe-area-inset-bottom)] pt-4">
        {signedIn ? (
          <p className="text-center text-xs text-muted-foreground">Loading your account…</p>
        ) : (
          <>
            <Button asChild size="lg" className="h-14 w-full text-base">
              <Link to="/auth" search={{ redirect: "/start" }}>
                Sign in with TXC wallet <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="h-12 w-full text-sm">
              <a href="https://beekeeper.honest.money" target="_blank" rel="noreferrer">
                I need a wallet first <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Business ---------------- */

function Business({
  userId,
  storeId,
  onCreated,
}: {
  userId: string;
  storeId: string | null;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    void (async () => {
      const { data } = await supabase
        .from("stores")
        .select("name, business_city, business_country")
        .eq("id", storeId)
        .maybeSingle();
      if (data) {
        setName(data.name ?? "");
        setCity(data.business_city ?? "");
        setCountry(data.business_country ?? "");
      }
    })();
  }, [storeId]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Give your business a name");
      return;
    }
    setSaving(true);
    try {
      if (storeId) {
        const { error } = await supabase
          .from("stores")
          .update({
            name: trimmed,
            business_city: city.trim() || null,
            business_country: country.trim() || null,
            listing_visibility: "city_only",
          })
          .eq("id", storeId);
        if (error) throw error;
        onCreated(storeId);
      } else {
        const { data, error } = await supabase
          .from("stores")
          .insert({
            owner_id: userId,
            name: trimmed,
            business_city: city.trim() || null,
            business_country: country.trim() || null,
            listing_visibility: "city_only",
            fiat_currency: "USD",
          })
          .select("id")
          .single();
        if (error) throw error;
        onCreated(data.id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">
        <h1 className="text-2xl font-semibold tracking-tight">What&apos;s your business called?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You can change this later. The city helps customers find you on the public map.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Business name
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Honey Bee BBQ"
              className="mt-1 h-14 w-full rounded-lg border border-input bg-background px-4 text-lg"
              autoCapitalize="words"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                City
              </span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Austin"
                className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3 text-sm"
                autoCapitalize="words"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Country
              </span>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="USA"
                className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3 text-sm"
                autoCapitalize="words"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 mt-8 bg-background pb-[env(safe-area-inset-bottom)] pt-4">
        <Button
          size="lg"
          onClick={save}
          disabled={saving || !name.trim()}
          className="h-14 w-full text-base"
        >
          {saving ? "Saving…" : "Continue"} <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Wallet Link ---------------- */

function WalletLink({ storeId, onDone }: { storeId: string; onDone: () => void }) {
  const createCode = useServerFn(createWalletLinkCode);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // Check if any chain is already configured (wallet linked previously).
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("chain_configs")
        .select("id")
        .eq("store_id", storeId)
        .limit(1);
      if (data && data.length > 0) setLinked(true);
    })();
  }, [storeId]);

  // Auto-generate the QR on mount.
  useEffect(() => {
    if (token || linked) return;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for redemption.
  useEffect(() => {
    if (!token || linked) return;
    const i = setInterval(async () => {
      const { data } = await supabase
        .from("wallet_link_codes")
        .select("used_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]?.used_at) {
        setLinked(true);
        toast.success("Wallet linked!");
      }
    }, 2500);
    return () => clearInterval(i);
  }, [token, linked, storeId]);

  const expired = expiresAt != null && now >= expiresAt;
  const secondsLeft = expiresAt == null ? 0 : Math.max(0, Math.floor((expiresAt - now) / 1000));

  async function generate() {
    setBusy(true);
    try {
      const result = await createCode({ data: { storeId, allowNewWallet: false } });
      const canonical =
        (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
        "https://nectar-pay.com";
      const linkUrl = `${canonical}/api/public/v1/wallet-link?token=${encodeURIComponent(result.token)}`;
      const dataUrl = await QRCode.toDataURL(linkUrl, { width: 320, margin: 1 });
      setQrDataUrl(dataUrl);
      setToken(result.token);
      setExpiresAt(new Date(result.expires_at).getTime());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not issue link code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">
        <h1 className="text-2xl font-semibold tracking-tight">Link your wallet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open <strong className="text-foreground">Beekeeper.money</strong> on your phone and scan
          this QR. We&apos;ll auto-import xpubs for every supported chain.
        </p>

        <div className="mt-6 grid place-items-center rounded-xl border border-primary/30 bg-primary/5 p-6">
          {linked ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="text-base font-medium">Wallet linked</p>
              <p className="text-xs text-muted-foreground">
                Your xpubs are imported. Enable the chains you want in store settings.
              </p>
            </div>
          ) : qrDataUrl && !expired ? (
            <>
              <img
                src={qrDataUrl}
                alt="Wallet link QR"
                className="h-64 w-64 rounded-lg bg-white p-2"
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Expires in {Math.floor(secondsLeft / 60)}:
                {(secondsLeft % 60).toString().padStart(2, "0")}
              </p>
            </>
          ) : expired ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Smartphone className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm">Code expired</p>
              <Button size="sm" onClick={generate} disabled={busy}>
                Generate new QR
              </Button>
            </div>
          ) : (
            <div className="flex h-64 w-64 items-center justify-center">
              <span className="text-xs text-muted-foreground">
                {busy ? "Generating QR…" : "Loading…"}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Don&apos;t have Beekeeper yet?{" "}
            <a
              href="https://beekeeper.honest.money"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              Get it free
            </a>
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 mt-8 space-y-2 bg-background pb-[env(safe-area-inset-bottom)] pt-4">
        <Button
          size="lg"
          onClick={onDone}
          disabled={!linked}
          className="h-14 w-full text-base"
        >
          {linked ? "Continue" : "Waiting for scan…"}
          {linked && <ArrowRight className="ml-2 h-5 w-5" />}
        </Button>
        <button
          type="button"
          onClick={onDone}
          className="block w-full text-center text-xs text-muted-foreground underline"
        >
          Skip for now — I&apos;ll link a wallet later
        </button>
      </div>
    </div>
  );
}

/* ---------------- Done ---------------- */

function Done({ storeId, onDashboard }: { storeId: string; onDashboard: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">
        <div className="mx-auto mt-6 grid h-20 w-20 place-items-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        </div>
        <h1 className="mt-6 text-center text-3xl font-semibold tracking-tight">
          You&apos;re live.
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Your store is set up and ready to take crypto payments. Here&apos;s what&apos;s next:
        </p>

        <div className="mt-6 space-y-3">
          <NextCard
            title="Take a test payment"
            desc="Open the POS on any phone or tablet. No app needed."
            to="/pos"
          />
          <NextCard
            title="Pair your terminal"
            desc="Enter the 6-digit code from your CryptoPOP device."
            to="/stores/$storeId/terminals"
            params={{ storeId }}
          />
          <NextCard
            title="Enable the chains you want"
            desc="USDC, USDT, PYUSD, BTC, TXC and more."
            to="/stores/$storeId/chains"
            params={{ storeId }}
          />
        </div>
      </div>

      <div className="sticky bottom-0 mt-8 bg-background pb-[env(safe-area-inset-bottom)] pt-4">
        <Button size="lg" onClick={onDashboard} className="h-14 w-full text-base">
          Go to dashboard <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function NextCard({
  title,
  desc,
  to,
  params,
}: {
  title: string;
  desc: string;
  to: string;
  params?: Record<string, string>;
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      className="block rounded-lg border border-border bg-card/50 p-4 transition active:scale-[0.99] hover:border-primary/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
