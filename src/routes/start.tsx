import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ExternalLink, Mail, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { NectarMark } from "@/components/marketing-shell";
import { createWalletLinkCode } from "@/lib/wallet-link.functions";
import { createPairingCode } from "@/lib/terminals.functions";
import { getLatestPosRelease } from "@/lib/pos-releases.functions";
import { saveCreds } from "@/lib/pos-client";
import { qrToDataURL } from "@/lib/qr";
import { PosLaunchChooser } from "@/components/pos-launch-chooser";



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
          { property: "og:url", content: "https://nectar-pay.com/start" },
],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/start" }],
  }),
  component: StartPage,
});

type Step = "welcome" | "business" | "wallet" | "terminal" | "done";
const STEPS: Step[] = ["welcome", "business", "wallet", "terminal", "done"];

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

  const stepIdx = STEPS.indexOf(step);
  const progress = Math.round(((stepIdx + 1) / STEPS.length) * 100);

  return (
    <>
    <PosLaunchChooser />
    <div className="min-h-[100dvh] bg-background flex flex-col">

      <header className="flex items-center justify-between px-5 pt-5">
        <Link to="/" className="flex items-center gap-2">
          <NectarMark className="h-7 w-7" />
          <span className="text-sm font-semibold tracking-tight">Nectar-PAY</span>
        </Link>
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Step {Math.max(1, stepIdx + 1)} / {STEPS.length}
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
          <WalletLink storeId={storeId} onDone={() => setStep("terminal")} />
        )}
        {step === "terminal" && storeId && (
          <TerminalDefaults storeId={storeId} onDone={() => setStep("done")} />
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

/* ---------------- Welcome / Choose sign-in ---------------- */

function Welcome({ signedIn }: { signedIn: boolean }) {
  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function verifyCode() {
    const trimmed = email.trim().toLowerCase();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      toast.error("Enter the code from your email");
      return;
    }
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: trimmed,
        token,
        type: "email",
      });
      if (error) throw error;
      toast.success("Signed in!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid or expired code");
    } finally {
      setVerifying(false);
    }
  }

  async function signInGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: typeof window !== "undefined" ? `${window.location.origin}/start` : undefined,
      });
      if (result.error) {
        toast.error(result.error.message || "Google sign-in failed");
      }
      // If redirected, browser navigates away. If tokens returned, useAuth picks up.
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendMagicLink() {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/start`,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send magic link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">
        <p className="text-[11px] uppercase tracking-[0.35em] text-primary">90-second setup</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">
          Start accepting crypto today.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Non-custodial. Zero per-transaction fees. Pick how you want to sign in — you can link a
          wallet for payouts in the next step.
        </p>

        {signedIn ? (
          <p className="mt-10 text-center text-xs text-muted-foreground">Loading your account…</p>
        ) : mode === "choose" ? (
          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={signInGoogle}
              disabled={busy}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-input bg-card text-base font-medium transition hover:bg-accent disabled:opacity-50"
            >
              <GoogleGlyph className="h-5 w-5" />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => setMode("email")}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-input bg-card text-base font-medium transition hover:bg-accent"
            >
              <Mail className="h-5 w-5" />
              Continue with email
            </button>
            <Link
              to="/auth"
              search={{ redirect: "/start" }}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-primary/40 bg-primary/10 text-base font-medium text-primary transition hover:bg-primary/15"
            >
              <Wallet className="h-5 w-5" />
              Continue with TXC wallet
            </Link>
            <p className="pt-2 text-center text-[11px] text-muted-foreground">
              Wallet sign-in is fully non-custodial — recommended once you&apos;re comfortable.
            </p>
          </div>
        ) : sent ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
              <Mail className="mx-auto h-10 w-10 text-primary" />
              <p className="mt-3 text-base font-medium">Check your inbox</p>
              <p className="mt-1 text-xs text-muted-foreground">
                We sent a sign-in email to{" "}
                <strong className="text-foreground">{email.trim()}</strong>.
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                <strong className="text-foreground">On a phone or laptop?</strong> Just tap the link
                in the email.
                <br />
                <strong className="text-foreground">On a terminal?</strong> Type the code
                below.
              </p>
            </div>

            <div className="rounded-xl border border-input bg-card p-4">
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Sign-in code
                </span>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={20}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="••••••"
                  className="mt-1 h-14 w-full rounded-lg border border-input bg-background px-4 text-center font-mono text-2xl tracking-[0.5em]"
                />
              </label>
              <Button
                size="lg"
                onClick={verifyCode}
                disabled={verifying || code.length < 6}
                className="mt-3 h-12 w-full text-base"
              >
                {verifying ? "Verifying…" : "Sign in with code"}
              </Button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSent(false);
                setCode("");
                setEmail("");
                setMode("choose");
              }}
              className="block w-full text-center text-xs text-muted-foreground underline"
            >
              Use a different method
            </button>
          </div>

        ) : (
          <div className="mt-8 space-y-3">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Email
              </span>
              <input
                autoFocus
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="mt-1 h-14 w-full rounded-lg border border-input bg-background px-4 text-lg"
              />
            </label>
            <Button
              size="lg"
              onClick={sendMagicLink}
              disabled={busy || !email.trim()}
              className="h-14 w-full text-base"
            >
              {busy ? "Sending…" : "Send magic link"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="block w-full text-center text-xs text-muted-foreground underline"
            >
              ← Back to sign-in options
            </button>
            <p className="pt-2 text-center text-[11px] text-muted-foreground">
              No password. We&apos;ll email you a one-tap login link.
            </p>
          </div>
        )}
      </div>

      {!signedIn && mode === "choose" && (
        <div className="sticky bottom-0 mt-8 bg-background pb-[env(safe-area-inset-bottom)] pt-4">
          <Button asChild variant="ghost" className="h-12 w-full text-sm">
            <a href="https://beekeeper.honest.money" target="_blank" rel="noreferrer">
              I need a wallet first <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.7 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2c-.4.4 6.7-4.9 6.7-14.8 0-1.3-.1-2.4-.4-3.5z" />
    </svg>
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
            mempool_accept_fast: true,
            mempool_max_usd: 1000,
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
      const dataUrl = await qrToDataURL(linkUrl, { width: 320, margin: 1 });
      setQrDataUrl(dataUrl);
      setToken(result.token);
      setExpiresAt(new Date(result.expires_at).getTime());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not issue link code");
    } finally {
      setBusy(false);
    }
  }

  const [enablingStables, setEnablingStables] = useState(false);
  const [stablesEnabled, setStablesEnabled] = useState(false);

  async function enableStandardStables() {
    setEnablingStables(true);
    try {
      const { SUPPORTED_STABLES_BY_CHAIN } = await import("@/lib/chains/networks");
      const { data, error } = await supabase
        .from("chain_configs")
        .select("id, chain, stables")
        .eq("store_id", storeId);
      if (error) throw error;
      const updates = (data ?? [])
        .map((c) => {
          const defaults = SUPPORTED_STABLES_BY_CHAIN[c.chain as keyof typeof SUPPORTED_STABLES_BY_CHAIN];
          if (!defaults || defaults.length === 0) return null;
          const merged = Array.from(
            new Set([...(c.stables ?? []), ...defaults.map((s) => s.toUpperCase())]),
          );
          return { id: c.id, stables: merged };
        })
        .filter((x): x is { id: string; stables: string[] } => x !== null);
      if (updates.length === 0) {
        toast.error("No stablecoin-capable chains found yet. Try re-linking your wallet.");
        return;
      }
      for (const u of updates) {
        const { error: upErr } = await supabase
          .from("chain_configs")
          .update({ enabled: true, qr_address_only: false, stables: u.stables })
          .eq("id", u.id);
        if (upErr) throw upErr;
      }
      setStablesEnabled(true);
      toast.success(`Enabled stablecoins on ${updates.length} chain${updates.length === 1 ? "" : "s"}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not enable stablecoins");
    } finally {
      setEnablingStables(false);
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

        {linked ? (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium">Enable standard stablecoin settings</p>
            <p className="mt-1 text-xs text-muted-foreground">
              We&apos;ll turn on USDC, USDT &amp; PYUSD on the EVM chains (Ethereum, Base, BSC,
              Polygon) plus USDT-TRC20 on Tron. You can get more complex later, when you&apos;re
              ready.
            </p>
            <Button
              size="sm"
              variant={stablesEnabled ? "secondary" : "default"}
              className="mt-3 w-full"
              onClick={enableStandardStables}
              disabled={enablingStables || stablesEnabled}
            >
              {stablesEnabled
                ? "Stablecoins enabled ✓"
                : enablingStables
                  ? "Enabling…"
                  : "Enable standard stablecoins"}
            </Button>
          </div>
        ) : (
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
        )}
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
        {!linked && (
          <button
            type="button"
            onClick={onDone}
            className="block w-full text-center text-xs text-muted-foreground underline"
          >
            Skip for now — I&apos;ll link a wallet later
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Terminal Defaults ---------------- */

interface TerminalDraft {
  pos_tip_enabled: boolean;
  pos_tip_presets_bps: number[];
  tax_mode: "none" | "inclusive" | "added";
  tax_bps: number;
  pos_signature_enabled: boolean;
  pos_email_receipt_enabled: boolean;
  pos_require_cashier_pin: boolean;
  pos_refund_enabled: boolean;
}

function TerminalDefaults({ storeId, onDone }: { storeId: string; onDone: () => void }) {
  const [draft, setDraft] = useState<TerminalDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("stores")
        .select(
          "pos_tip_enabled, pos_tip_presets_bps, tax_mode, tax_bps, pos_signature_enabled, pos_email_receipt_enabled, pos_require_cashier_pin, pos_refund_enabled",
        )
        .eq("id", storeId)
        .maybeSingle();
      setDraft({
        pos_tip_enabled: (data?.pos_tip_enabled as boolean) ?? true,
        pos_tip_presets_bps: ((data?.pos_tip_presets_bps as number[]) ?? [1500, 1800, 2000]),
        tax_mode: ((data?.tax_mode as TerminalDraft["tax_mode"]) ?? "none"),
        tax_bps: (data?.tax_bps as number) ?? 0,
        pos_signature_enabled: (data?.pos_signature_enabled as boolean) ?? false,
        pos_email_receipt_enabled: (data?.pos_email_receipt_enabled as boolean) ?? true,
        pos_require_cashier_pin: (data?.pos_require_cashier_pin as boolean) ?? false,
        pos_refund_enabled: (data?.pos_refund_enabled as boolean) ?? false,
      });
    })();
  }, [storeId]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const tipPresets = draft.pos_tip_presets_bps
        .map((n) => Math.max(0, Math.round(n)))
        .slice(0, 3);
      const { error } = await supabase
        .from("stores")
        .update({
          pos_tip_enabled: draft.pos_tip_enabled,
          pos_tip_presets_bps: tipPresets,
          tax_mode: draft.tax_mode,
          tax_bps: Math.max(0, Math.round(draft.tax_bps)),
          pos_signature_enabled: draft.pos_signature_enabled,
          pos_email_receipt_enabled: draft.pos_email_receipt_enabled,
          pos_require_cashier_pin: draft.pos_require_cashier_pin,
          pos_refund_enabled: draft.pos_refund_enabled,
        })
        .eq("id", storeId);
      if (error) throw error;
      toast.success("Terminal defaults saved.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">
        <h1 className="text-2xl font-semibold tracking-tight">Terminal defaults</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Quick toggles for every device on your account. Fine-tune anything else later from the
          desktop dashboard.
        </p>

        <div className="mt-6 space-y-3">
          {/* Tipping */}
          <ToggleCard
            title="Tipping"
            desc="Show tip prompt before payment."
            checked={draft.pos_tip_enabled}
            onChange={(v) => setDraft({ ...draft, pos_tip_enabled: v })}
          >
            {draft.pos_tip_enabled && (
              <div className="mt-3 flex gap-2">
                {draft.pos_tip_presets_bps.map((bps, i) => (
                  <div
                    key={i}
                    className="flex flex-1 items-center rounded-md border border-border bg-background"
                  >
                    <input
                      type="number"
                      min={0}
                      max={100}
                      inputMode="numeric"
                      value={Math.round(bps / 100)}
                      onChange={(e) => {
                        const next = [...draft.pos_tip_presets_bps];
                        next[i] = Math.max(0, Math.min(100, Number(e.target.value || 0))) * 100;
                        setDraft({ ...draft, pos_tip_presets_bps: next });
                      }}
                      className="w-full bg-transparent px-2 py-2 text-center text-sm outline-none"
                    />
                    <span className="pr-2 text-xs text-muted-foreground">%</span>
                  </div>
                ))}
              </div>
            )}
          </ToggleCard>

          {/* Tax */}
          <ToggleCard
            title="Sales tax"
            desc="Add or include tax on totals."
            checked={draft.tax_mode !== "none"}
            onChange={(v) =>
              setDraft({ ...draft, tax_mode: v ? "added" : "none", tax_bps: v ? draft.tax_bps || 825 : 0 })
            }
          >
            {draft.tax_mode !== "none" && (
              <div className="mt-3 flex gap-2">
                <select
                  value={draft.tax_mode}
                  onChange={(e) =>
                    setDraft({ ...draft, tax_mode: e.target.value as TerminalDraft["tax_mode"] })
                  }
                  className="flex-1 rounded-md border border-border bg-background px-2 py-2 text-sm"
                >
                  <option value="added">Added on top</option>
                  <option value="inclusive">Already included</option>
                </select>
                <div className="flex flex-1 items-center rounded-md border border-border bg-background">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={30}
                    inputMode="decimal"
                    value={(draft.tax_bps / 100).toFixed(2)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        tax_bps: Math.max(0, Math.min(3000, Math.round(Number(e.target.value || 0) * 100))),
                      })
                    }
                    className="w-full bg-transparent px-2 py-2 text-center text-sm outline-none"
                  />
                  <span className="pr-2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            )}
          </ToggleCard>

          <ToggleCard
            title="Signature capture"
            desc="Ask customer to sign on screen."
            checked={draft.pos_signature_enabled}
            onChange={(v) => setDraft({ ...draft, pos_signature_enabled: v })}
          />

          <ToggleCard
            title="Receipt prompt"
            desc="Offer email receipt after payment. Customize from desktop."
            checked={draft.pos_email_receipt_enabled}
            onChange={(v) => setDraft({ ...draft, pos_email_receipt_enabled: v })}
          />

          <ToggleCard
            title="Cashier PIN"
            desc="Require a 4-digit PIN to unlock the terminal."
            checked={draft.pos_require_cashier_pin}
            onChange={(v) => setDraft({ ...draft, pos_require_cashier_pin: v })}
          />

          <ToggleCard
            title="Refunds on terminal"
            desc="Allow cashiers to refund a recent payment."
            checked={draft.pos_refund_enabled}
            onChange={(v) => setDraft({ ...draft, pos_refund_enabled: v })}
          />
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          More options on desktop: quick items, custom tenders, end-of-day reports, reference
          codes, refund reasons, receipt branding, void/hold, SMS receipts, idle-lock timeout.
        </p>
      </div>

      <div className="sticky bottom-0 mt-8 space-y-2 bg-background pb-[env(safe-area-inset-bottom)] pt-4">
        <Button size="lg" onClick={save} disabled={saving} className="h-14 w-full text-base">
          {saving ? "Saving…" : "Save & continue"}
          {!saving && <ArrowRight className="ml-2 h-5 w-5" />}
        </Button>
        <button
          type="button"
          onClick={onDone}
          className="block w-full text-center text-xs text-muted-foreground underline"
        >
          Skip — use defaults
        </button>
      </div>
    </div>
  );
}

function ToggleCard({
  title,
  desc,
  checked,
  onChange,
  children,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <label className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
        </div>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-primary"
        />
      </label>
      {children}
    </div>
  );
}

/* ---------------- Done ---------------- */



function Done({ storeId, onDashboard }: { storeId: string; onDashboard: () => void }) {
  const pair = useServerFn(createPairingCode);
  const [pairing, setPairing] = useState(false);

  async function useThisDeviceAsTerminal() {
    setPairing(true);
    try {
      const row = await pair({ data: { storeId, label: "This device" } });
      const origin = window.location.origin;
      const res = await fetch(`${origin}/api/public/v1/terminals/pair`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: row.code }),
      });
      const body = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) throw new Error((body as { error?: string })?.error ?? "Pair failed");
      const creds = body as { terminal_id: string; hmac_secret: string; api_base?: string };
      saveCreds({
        terminalId: creds.terminal_id,
        secret: creds.hmac_secret,
        apiBase: creds.api_base ?? origin,
      });
      window.TerminalAuth?.save?.(creds.terminal_id, creds.hmac_secret);
      toast.success("This device is now a terminal.");
      window.location.href = "/pos";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not pair this device.");
      setPairing(false);
    }
  }

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
          <button
            type="button"
            onClick={useThisDeviceAsTerminal}
            disabled={pairing}
            className="block w-full rounded-lg border border-primary/60 bg-primary/10 p-4 text-left transition active:scale-[0.99] hover:bg-primary/15 disabled:opacity-60"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {pairing ? "Pairing this device…" : "Use this device as a terminal"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Already on the terminal? Skip the pairing code — we&apos;ll set it up right now.
                </div>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
            </div>
          </button>
          <InstallPosCard />
          <NextCard
            title="Take a test payment"
            desc="Open the POS on any phone or tablet. No app needed."
            to="/pos"
          />

          <NextCard
            title="Pair another terminal"
            desc="Generate a 6-char code for a CryptoPOP or extra device."
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
        <Button size="lg" onClick={onDashboard} variant="outline" className="h-14 w-full text-base">
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

/* ---------------- Install POS APK card ---------------- */

function InstallPosCard() {
  const load = useServerFn(getLatestPosRelease);
  const [rel, setRel] = useState<{
    version: string | null;
    url: string | null;
    sha256: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await load();
        setRel({ version: r.version, url: r.url, sha256: r.sha256 });
      } catch {
        setRel({ version: null, url: null, sha256: null });
      }
    })();
  }, [load]);

  const installUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/pos-apk`;

  const hasBuild = Boolean(rel?.version && rel?.url);

  return (
    <div className="block rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-amber-500" />
            <div className="text-sm font-semibold text-foreground">
              Install POS app on your terminal
            </div>
            {rel?.version && (
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono text-amber-600 dark:text-amber-400">
                v{rel.version}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            For Senraise terminals. Drives the printer and NFC reader natively —
            taps a customer&apos;s card and prints the receipt in one flow.
          </p>

          <div className="mt-3 space-y-2">
            {hasBuild ? (
              <a
                href={rel!.url!}
                className="inline-flex h-10 items-center justify-center rounded-md bg-amber-500 px-4 text-sm font-semibold text-black transition hover:bg-amber-400"
              >
                Download APK
              </a>
            ) : (
              <div className="rounded border border-dashed border-border p-3 text-xs text-muted-foreground">
                No build published yet. Push to the{" "}
                <code className="rounded bg-muted px-1 py-0.5">pos-app</code> branch
                or tag <code className="rounded bg-muted px-1 py-0.5">pos-v0.1.0</code>{" "}
                to trigger the CI build.
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(installUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex w-full items-center justify-between rounded border border-border bg-background/50 px-3 py-2 text-left text-xs"
            >
              <span className="font-mono text-muted-foreground">{installUrl}</span>
              <span className="text-primary">{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            <li>On the terminal: Settings → Security → allow install from unknown sources.</li>
            <li>Open a browser and type the URL above, or scan the QR on your onboarding card.</li>
            <li>Tap the downloaded APK → Install → open. The app auto-loads your pairing code.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

