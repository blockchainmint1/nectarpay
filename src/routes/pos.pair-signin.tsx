// /pos/pair-signin — bypass the 6-char pairing code flow.
//
// Instead of generating a code on the dashboard, the merchant just signs in
// with their existing NectarPay account here on the terminal, picks the
// store, and we auto-generate a pairing code + immediately consume it to
// provision terminal credentials. Perfect for re-pairing after a factory
// reset or swapping in a replacement device — their store, wallets, tips,
// and receipt settings are all still intact.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Loader2, Store as StoreIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { createPairingCode } from "@/lib/terminals.functions";
import { saveCreds, type TerminalCreds } from "@/lib/pos-client";

export const Route = createFileRoute("/pos/pair-signin")({
  head: () => ({
    meta: [
      { title: "Sign in to pair · Nectar.Pay POS" },
      { name: "viewport", content: "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" },
      { name: "theme-color", content: "#1a1108" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PairSigninPage,
});

interface Store {
  id: string;
  name: string;
  business_city: string | null;
  business_country: string | null;
}

interface PairResponse {
  terminal_id: string;
  hmac_secret: string;
  store_id: string;
  store_name: string;
  api_base?: string;
}

async function consumePairingCode(code: string): Promise<PairResponse> {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch(`${base}/api/public/v1/terminals/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string })?.error ?? `pair failed (${res.status})`);
  return body as PairResponse;
}

function PairSigninPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const createCode = useServerFn(createPairingCode);

  const [stores, setStores] = useState<Store[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [terminalLabel, setTerminalLabel] = useState("");

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, business_city, business_country")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) setLoadErr(error.message);
      else setStores((data ?? []) as Store[]);
    })();
    return () => { cancelled = true; };
  }, [user, loading]);

  const pair = useMutation({
    mutationFn: async (storeId: string) => {
      const label = terminalLabel.trim() || `Terminal (${new Date().toLocaleDateString()})`;
      const code = await createCode({ data: { storeId, label } });
      const creds = await consumePairingCode(code.code);
      return creds;
    },
    onSuccess: (creds) => {
      const stored: TerminalCreds = {
        terminalId: creds.terminal_id,
        secret: creds.hmac_secret,
        apiBase: creds.api_base ?? window.location.origin,
      };
      saveCreds(stored);
      (window as unknown as { TerminalAuth?: { save?: (a: string, b: string) => void } })
        .TerminalAuth?.save?.(creds.terminal_id, creds.hmac_secret);
      navigate({ to: "/pos" });
    },
  });

  if (loading) {
    return <FullScreenMessage title="LOADING…" />;
  }

  if (!user) {
    const redirect = "/pos/pair-signin";
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#1a1108] text-white px-6">
        <div className="text-[10px] font-bold tracking-[0.3em] text-white/50">PAIR WITH ACCOUNT</div>
        <h1 className="mt-2 text-2xl font-bold text-center">Sign in to your NectarPay account</h1>
        <p className="mt-3 max-w-xs text-center text-sm text-white/60">
          If your store is already set up, sign in here and we&apos;ll re-pair this terminal to it automatically — no pairing code needed.
        </p>
        <div className="mt-8 w-full max-w-xs space-y-3">
          <Link
            to="/auth"
            search={{ redirect }}
            className="block w-full rounded-lg bg-amber-500 py-3 text-center text-sm font-bold tracking-widest text-black hover:bg-amber-400"
          >
            SIGN IN <ArrowRight className="ml-1 inline h-4 w-4" />
          </Link>
          <Link
            to="/pos/pair"
            className="block w-full rounded-lg border border-white/15 bg-white/5 py-3 text-center text-sm font-semibold tracking-wide text-white/90 hover:bg-white/10"
          >
            USE PAIRING CODE INSTEAD
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto bg-[#1a1108] text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
        <div className="text-[10px] font-bold tracking-[0.3em] text-white/50">PAIR WITH ACCOUNT</div>
        <h1 className="mt-2 text-2xl font-bold">Pick the store</h1>
        <p className="mt-2 text-sm text-white/60">
          Signed in as <span className="text-white/90">{user.email}</span>. Choose which store this terminal belongs to.
        </p>

        <label className="mt-6 block">
          <span className="text-[10px] font-bold tracking-[0.25em] text-white/50">TERMINAL NAME (OPTIONAL)</span>
          <input
            value={terminalLabel}
            onChange={(e) => setTerminalLabel(e.target.value)}
            placeholder="Front counter"
            maxLength={80}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-base placeholder:text-white/25"
          />
        </label>

        {loadErr && <p className="mt-4 text-sm text-red-400">{loadErr}</p>}
        {pair.error && <p className="mt-4 text-sm text-red-400">{(pair.error as Error).message}</p>}

        {stores === null ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your stores…
          </div>
        ) : stores.length === 0 ? (
          <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-white/70">
            <p>You don&apos;t have any stores set up yet.</p>
            <Link
              to="/start"
              className="mt-3 inline-block rounded-md bg-amber-500 px-3 py-2 text-xs font-bold tracking-widest text-black hover:bg-amber-400"
            >
              CREATE A STORE
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {stores.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={pair.isPending}
                onClick={() => pair.mutate(s.id)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-left hover:border-amber-400/60 hover:bg-white/10 disabled:opacity-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-300">
                    <StoreIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{s.name}</div>
                    {(s.business_city || s.business_country) && (
                      <div className="truncate text-xs text-white/50">
                        {[s.business_city, s.business_country].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                {pair.isPending && pair.variables === s.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
                ) : (
                  <ArrowRight className="h-5 w-5 text-white/40" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto pt-8">
          <Link
            to="/pos/pair"
            className="block w-full rounded-lg border border-white/10 bg-white/5 py-3 text-center text-xs font-semibold tracking-widest text-white/70 hover:bg-white/10"
          >
            USE PAIRING CODE INSTEAD
          </Link>
        </div>
      </div>
    </div>
  );
}

function FullScreenMessage({ title }: { title: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#1a1108] text-white">
      <p className="text-[10px] font-bold tracking-[0.3em] text-white/60">{title}</p>
    </div>
  );
}
