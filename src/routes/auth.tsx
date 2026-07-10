import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Mail, Wallet } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { WALLET_POLL_INTERVAL_MS } from "@/lib/wallet-auth-shared";
import { qrToString } from "@/lib/qr";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in with TXC Wallet · Nectar.Pay" },
      {
        name: "description",
        content:
          "Scan with your TEXITcoin wallet to sign in. Nectar.Pay is wallet-only — no email, no password, no custody.",
      },
          { property: "og:url", content: "https://nectar-pay.com/auth" },
],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/auth" }],
  }),
  component: AuthPage,
});

type Challenge = {
  id: string;
  nonce: string;
  expires_at: string;
  deep_link: string;
  qr_data: string;
  message: string;
};

type Status =
  | { kind: "loading" }
  | { kind: "waiting"; challenge: Challenge }
  | { kind: "signing"; challenge: Challenge }
  | { kind: "expired" }
  | { kind: "error"; message: string };

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"choose" | "wallet" | "email">("choose");
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [qrSvg, setQrSvg] = useState<string>("");
  const [remaining, setRemaining] = useState<number>(0);
  const cancelled = useRef(false);

  // Already signed in → bounce (admins to /admin)
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      navigate({ to: resolvePostAuthPath(Boolean(adminRole), search.redirect) });
    })();
  }, [authLoading, user, navigate, search.redirect]);

  // Create wallet challenge when entering wallet mode
  useEffect(() => {
    if (mode !== "wallet") return;
    cancelled.current = false;
    void createChallenge();
    return () => {
      cancelled.current = true;
    };
  }, [mode]);

  async function createChallenge() {
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/public/auth/wallet-challenge", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Could not create challenge");
      const ch = (await res.json()) as Challenge;
      if (cancelled.current) return;

      const svg = await qrToString(ch.qr_data, {
        type: "svg",
        margin: 1,
        width: 280,
        color: { dark: "#020617", light: "#ffffff" },
      });
      if (cancelled.current) return;
      setQrSvg(svg);
      setStatus({ kind: "waiting", challenge: ch });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  // Countdown timer
  useEffect(() => {
    if (status.kind !== "waiting" && status.kind !== "signing") return;
    const expiresAt = new Date(status.challenge.expires_at).getTime();
    const tick = () => {
      const ms = expiresAt - Date.now();
      if (ms <= 0) {
        setStatus({ kind: "expired" });
        return;
      }
      setRemaining(Math.ceil(ms / 1000));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [status]);

  // Poll for signature
  useEffect(() => {
    if (status.kind !== "waiting") return;
    const challengeId = status.challenge.id;
    let stopped = false;

    async function poll() {
      while (!stopped) {
        await new Promise((r) => setTimeout(r, WALLET_POLL_INTERVAL_MS));
        if (stopped) return;
        try {
          const res = await fetch(`/api/public/auth/wallet-status?id=${challengeId}`);
          if (!res.ok) continue;
          const data = (await res.json()) as {
            status: string;
            token?: string;
            wallet_address?: string;
          };
          if (data.status === "expired") {
            setStatus({ kind: "expired" });
            return;
          }
          if (data.status === "signed" && data.token) {
            stopped = true;
            await exchange(challengeId, data.token);
            return;
          }
        } catch {
          // Network blip — keep polling
        }
      }
    }

    setStatus((s) => (s.kind === "waiting" ? { kind: "waiting", challenge: s.challenge } : s));
    void poll();
    return () => {
      stopped = true;
    };
  }, [status.kind === "waiting" ? status.challenge.id : null]); // eslint-disable-line react-hooks/exhaustive-deps

  async function exchange(challengeId: string, token: string) {
    setStatus((s) => (s.kind === "waiting" ? { kind: "signing", challenge: s.challenge } : s));
    try {
      const res = await fetch("/api/public/auth/wallet-exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: challengeId, token }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Exchange failed");
      }
      const data = (await res.json()) as {
        email: string;
        token_hash: string;
        is_admin: boolean;
      };

      const { error } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: data.token_hash,
      });
      if (error) throw error;

      toast.success("Signed in");
      navigate({
        to: resolvePostAuthPath(data.is_admin, search.redirect),
      });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Sign-in failed",
      });
    }
  }

  async function signInGoogle() {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      if (result.error) {
        toast.error(result.error.message || "Google sign-in failed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed");
    }
  }



  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <div className="mx-auto flex max-w-lg flex-col px-4 py-16">
        <div className="rounded-xl border border-border bg-card/60 p-8">
          <div className="text-center">
            <p className="text-[0.7rem] uppercase tracking-[0.4em] text-muted-foreground">
              {mode === "wallet"
                ? "Non-custodial · no passwords"
                : "Welcome back"}
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {mode === "choose"
                ? "Sign in to Nectar-PAY"
                : mode === "email"
                  ? "Sign in with email"
                  : "Sign in with your TXC wallet"}
            </h1>
            {mode === "wallet" && (
              <p className="mt-2 text-sm text-muted-foreground">
                Scan this QR with your TEXITcoin mobile wallet and approve the sign-in request.
              </p>
            )}
          </div>

          {mode === "choose" && (
            <ChooseMode
              onGoogle={() => void signInGoogle()}
              onEmail={() => setMode("email")}
              onWallet={() => setMode("wallet")}
            />
          )}

          {mode === "email" && (
            <EmailSignIn
              redirect={search.redirect}
              onBack={() => setMode("choose")}
            />
          )}

          {mode === "wallet" && (
            <>
              <div className="mt-8 flex flex-col items-center">
                {status.kind === "loading" ? (
                  <div className="flex h-[280px] w-[280px] items-center justify-center rounded-lg border border-border bg-muted/20">
                    <span className="text-xs text-muted-foreground">Generating challenge…</span>
                  </div>
                ) : status.kind === "expired" ? (
                  <div className="flex h-[280px] w-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5">
                    <p className="text-sm text-destructive">QR code expired</p>
                    <Button size="sm" onClick={createChallenge}>
                      New QR
                    </Button>
                  </div>
                ) : status.kind === "error" ? (
                  <div className="flex h-[280px] w-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center">
                    <p className="text-sm text-destructive">{status.message}</p>
                    <Button size="sm" onClick={createChallenge}>
                      Try again
                    </Button>
                  </div>
                ) : (
                  <>
                    <div
                      className="rounded-lg border border-border bg-white p-4"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                    <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          status.kind === "signing"
                            ? "animate-pulse bg-primary"
                            : "animate-pulse bg-emerald-500"
                        }`}
                      />
                      {status.kind === "signing"
                        ? "Verifying signature…"
                        : `Waiting for wallet · expires in ${formatTime(remaining)}`}
                    </div>
                    <a
                      href={status.challenge.deep_link}
                      className="mt-4 text-xs uppercase tracking-[0.3em] text-primary hover:underline"
                    >
                      Open on this device →
                    </a>
                  </>
                )}
              </div>

              {(status.kind === "waiting" || status.kind === "signing") && (
                <ManualSignIn
                  challenge={status.challenge}
                  onError={(message) => setStatus({ kind: "error", message })}
                />
              )}

              <div className="mt-8 space-y-3 border-t border-border/60 pt-6 text-xs text-muted-foreground">
                <p>
                  <strong className="text-foreground">No TXC wallet yet?</strong>{" "}
                  <a
                    href="https://beekeeper.honest.money"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    Get Beekeeper.money Wallet →
                  </a>
                </p>
                <p>
                  Signing a sign-in request <strong className="text-foreground">does not</strong> move
                  any funds. Nectar-PAY never holds your keys or your crypto.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMode("choose")}
                className="mt-6 block w-full text-center text-xs text-muted-foreground underline"
              >
                ← Back to sign-in options
              </button>
            </>
          )}
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}

function resolvePostAuthPath(isAdmin: boolean, redirect?: string) {
  if (isAdmin && (!redirect || redirect === "/dashboard")) return "/admin";
  return redirect ?? (isAdmin ? "/admin" : "/dashboard");
}

function ManualSignIn({
  challenge,
  onError,
}: {
  challenge: Challenge;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(challenge.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  async function submit() {
    const addr = address.trim();
    const sig = signature.trim();
    if (!addr || !sig) {
      toast.error("Address and signature required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/auth/wallet-callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: challenge.id,
          address: addr,
          signature: sig,
          message: challenge.message,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const msg = data.error ?? `Sign-in failed (${res.status})`;
        toast.error(msg);
        onError(msg);
        return;
      }
      toast.success("Signature accepted — finishing sign-in…");
      // The QR polling loop will pick up the signed status and complete the exchange.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-border/60 bg-muted/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
      >
        <span>Sign in by pasting a signature</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-border/60 p-4">
          <p className="text-xs text-muted-foreground">
            Use this if your wallet can&apos;t scan the QR. Copy the message below, sign it in your
            TXC wallet (Tools → Sign Message), then paste the exact address shown by that signing
            tool and the resulting signature here.
          </p>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                Message to sign
              </label>
              <button
                type="button"
                onClick={copyMessage}
                className="text-xs text-primary hover:underline"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <textarea
              readOnly
              value={challenge.message}
              rows={6}
              onFocus={(e) => e.currentTarget.select()}
              className="max-h-40 w-full resize-none overflow-auto rounded-md border border-border bg-background/60 p-3 text-[0.7rem] leading-relaxed text-foreground whitespace-pre-wrap break-all"
            />
          </div>

          <div>
            <label className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              Your TXC wallet address
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Tabc…"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              Signature (base64)
            </label>
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Hxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx="
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
            />
          </div>

          <Button type="button" onClick={submit} disabled={submitting} className="w-full">
            {submitting ? "Verifying…" : "Submit signature"}
          </Button>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ChooseMode({
  onGoogle,
  onEmail,
  onWallet,
}: {
  onGoogle: () => void;
  onEmail: () => void;
  onWallet: () => void;
}) {
  return (
    <div className="mt-8 space-y-3">
      <button
        type="button"
        onClick={onGoogle}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-input bg-card text-base font-medium transition hover:bg-accent"
      >
        <GoogleGlyph className="h-5 w-5" />
        Continue with Google
      </button>
      <button
        type="button"
        onClick={onEmail}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-input bg-card text-base font-medium transition hover:bg-accent"
      >
        <Mail className="h-5 w-5" />
        Continue with email
      </button>
      <button
        type="button"
        onClick={onWallet}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-primary/40 bg-primary/10 text-base font-medium text-primary transition hover:bg-primary/15"
      >
        <Wallet className="h-5 w-5" />
        Continue with TXC wallet
      </button>
      <p className="pt-2 text-center text-[11px] text-muted-foreground">
        Wallet sign-in is fully non-custodial — recommended once you&apos;re comfortable.
      </p>
    </div>
  );
}

function EmailSignIn({
  redirect,
  onBack,
}: {
  redirect?: string;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function sendMagicLink() {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      const target = redirect ?? "/dashboard";
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}${target}`,
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

  if (sent) {
    return (
      <div className="mt-8 space-y-4">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
          <Mail className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 text-base font-medium">Check your inbox</p>
          <p className="mt-1 text-xs text-muted-foreground">
            We sent a sign-in email to <strong className="text-foreground">{email.trim()}</strong>.
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Tap the link on this device, or type the code below.
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
              pattern="[0-9 ]*"
              maxLength={9}
              value={code.length > 4 ? `${code.slice(0, 4)} ${code.slice(4)}` : code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="•••• ••••"
              className="mt-1 h-14 w-full rounded-lg border border-input bg-background px-4 text-center font-mono text-2xl tracking-[0.5em]"
            />
          </label>
          <Button
            size="lg"
            onClick={verifyCode}
            disabled={verifying || code.length < 8}
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
            onBack();
          }}
          className="block w-full text-center text-xs text-muted-foreground underline"
        >
          Use a different method
        </button>
      </div>
    );
  }

  return (
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
        onClick={onBack}
        className="block w-full text-center text-xs text-muted-foreground underline"
      >
        ← Back to sign-in options
      </button>
      <p className="pt-2 text-center text-[11px] text-muted-foreground">
        No password. We&apos;ll email you a code and a one-tap login link.
      </p>
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
