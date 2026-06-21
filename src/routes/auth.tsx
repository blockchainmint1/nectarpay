import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { MarketingNav } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { WALLET_POLL_INTERVAL_MS } from "@/lib/wallet-auth-shared";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in with TXC Wallet · payHME" },
      {
        name: "description",
        content:
          "Scan with your TEXITcoin wallet to sign in. payHME is wallet-only — no email, no password, no custody.",
      },
    ],
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

  // Create challenge on mount
  useEffect(() => {
    cancelled.current = false;
    void createChallenge();
    return () => {
      cancelled.current = true;
    };
  }, []);

  async function createChallenge() {
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/public/auth/wallet-challenge", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Could not create challenge");
      const ch = (await res.json()) as Challenge;
      if (cancelled.current) return;

      const svg = await QRCode.toString(ch.qr_data, {
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

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <div className="mx-auto flex max-w-lg flex-col px-4 py-16">
        <div className="rounded-xl border border-border bg-card/60 p-8">
          <div className="text-center">
            <p className="text-[0.7rem] uppercase tracking-[0.4em] text-muted-foreground">
              Wallet-only · no passwords
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              Sign in with your TXC wallet
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Scan this QR with your TEXITcoin mobile wallet and approve the sign-in request.
            </p>
          </div>

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
                href="https://wallet.honest.money"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Get TEXITcoin Wallet →
              </a>
            </p>
            <p>
              Signing a sign-in request <strong className="text-foreground">does not</strong> move
              any funds. payHME never holds your keys or your crypto.
            </p>
          </div>
        </div>
      </div>
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
