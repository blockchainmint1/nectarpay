// /pos/pair — pair a POS device to a NectarPay store via 6-char code.
//
// Has native-bridge hooks for the eventual Android APK:
//   window.TerminalAuth.save(id, secret)
//   window.Pairing.startScan() / stopScan()
//   window.onPairingScan(payload)

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { saveCreds, type TerminalCreds } from "@/lib/pos-client";

export const Route = createFileRoute("/pos/pair")({
  head: () => ({
    meta: [
      { title: "Pair terminal · Nectar.Pay POS" },
      { name: "viewport", content: "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" },
      { name: "theme-color", content: "#0a0d12" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PairPage,
});

declare global {
  interface Window {
    TerminalAuth?: { save: (id: string, secret: string) => void };
    Pairing?: { startScan?: () => void; stopScan?: () => void };
    onPairingScan?: (payload: string) => void;
  }
}

interface PairResponse {
  terminal_id: string;
  hmac_secret: string;
  store_id: string;
  store_name: string;
  api_base: string;
}

async function pairCall(code: string, apiBase: string): Promise<PairResponse> {
  const base = (apiBase || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  const res = await fetch(`${base}/api/public/v1/terminals/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string })?.error ?? `pair failed (${res.status})`);
  return { ...(body as PairResponse), api_base: (body as PairResponse).api_base ?? base };
}

function PairPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [apiHint, setApiHint] = useState("");

  const m = useMutation({
    mutationFn: (args: { code: string; api: string }) => pairCall(args.code, args.api),
    onSuccess: (creds) => {
      const stored: TerminalCreds = {
        terminalId: creds.terminal_id,
        secret: creds.hmac_secret,
        apiBase: creds.api_base,
      };
      saveCreds(stored);
      window.TerminalAuth?.save?.(creds.terminal_id, creds.hmac_secret);
      const here = typeof window !== "undefined" ? window.location.origin : "";
      if (creds.api_base && creds.api_base !== here) {
        window.location.href = `${creds.api_base}/pos`;
      } else {
        navigate({ to: "/pos" });
      }
    },
  });

  // Native APK bridge for QR scans → onPairingScan(json|raw)
  useEffect(() => {
    window.onPairingScan = (payload: string) => {
      try {
        const parsed = JSON.parse(payload);
        if (parsed?.code) {
          const api = parsed.api ?? parsed.host ?? "";
          setCode(parsed.code);
          setApiHint(api);
          m.mutate({ code: String(parsed.code).toUpperCase(), api });
          return;
        }
      } catch { /* not JSON */ }
      if (typeof payload === "string" && payload.length >= 4) {
        setCode(payload.toUpperCase());
        m.mutate({ code: payload.toUpperCase(), api: "" });
      }
    };
    window.Pairing?.startScan?.();
    return () => {
      window.Pairing?.stopScan?.();
      delete window.onPairingScan;
    };
  }, [m]);

  return (
    <div className="fixed inset-0 bg-[#0a0d12] text-white flex flex-col items-center justify-center px-6">
      <div className="text-[10px] font-bold tracking-[0.3em] text-white/50">PAIR TERMINAL</div>
      <h1 className="mt-2 text-2xl font-bold">Enter pairing code</h1>
      <p className="mt-2 max-w-xs text-center text-sm text-white/60">
        From your NectarPay dashboard, open the store, click <span className="font-mono">Terminals</span>, then <span className="font-mono">Pair a device</span>.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); if (code.trim().length >= 4) m.mutate({ code: code.trim().toUpperCase(), api: apiHint }); }}
        className="mt-8 w-full max-w-xs space-y-3"
      >
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))}
          placeholder="ABC234"
          maxLength={8}
          inputMode="text"
          autoCapitalize="characters"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-4 text-center text-3xl font-mono tracking-[0.4em] uppercase placeholder:text-white/20"
        />
        {m.error && <p className="text-center text-xs text-red-400">{(m.error as Error).message}</p>}
        <button
          type="submit"
          disabled={m.isPending || code.length < 4}
          className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-bold tracking-widest text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          {m.isPending ? "PAIRING…" : "PAIR"}
        </button>
      </form>
    </div>
  );
}
