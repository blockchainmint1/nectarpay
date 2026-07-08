// /pos/pair — pair a POS device to a NectarPay store via 6-char code.
//
// Has native-bridge hooks for the eventual Android APK:
//   window.TerminalAuth.save(id, secret)
//   window.Pairing.startScan() / stopScan()
//   window.onPairingScan(payload)

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Camera, X } from "lucide-react";
import { saveCreds, type TerminalCreds } from "@/lib/pos-client";

export const Route = createFileRoute("/pos/pair")({
  head: () => ({
    meta: [
      { title: "Pair terminal · Nectar.Pay POS" },
      { name: "viewport", content: "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" },
      { name: "theme-color", content: "#1a1108" },
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
    BarcodeDetector?: new (opts?: { formats?: string[] }) => {
      detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
    };
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
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [alreadyPaired, setAlreadyPaired] = useState(false);

  // If this device is already paired, don't show the pair form — bounce to /pos
  // (which enforces the PIN lock). Re-pairing requires explicit Unpair from settings.
  useEffect(() => {
    const existing = (typeof window !== "undefined") ? (() => {
      try {
        return localStorage.getItem("pos.terminal.id") && localStorage.getItem("pos.terminal.secret");
      } catch { return null; }
    })() : null;
    if (existing) {
      setAlreadyPaired(true);
      navigate({ to: "/pos", replace: true });
    }
  }, [navigate]);


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

  function handleScannedPayload(payload: string) {
    try {
      const parsed = JSON.parse(payload);
      if (parsed?.code) {
        const api = parsed.api ?? parsed.host ?? "";
        setCode(String(parsed.code).toUpperCase());
        setApiHint(api);
        m.mutate({ code: String(parsed.code).toUpperCase(), api });
        return;
      }
    } catch { /* not JSON */ }
    if (typeof payload === "string" && payload.length >= 4) {
      const c = payload.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 8);
      if (c.length >= 4) {
        setCode(c);
        m.mutate({ code: c, api: "" });
      }
    }
  }

  // Native APK bridge for QR scans → onPairingScan(json|raw)
  useEffect(() => {
    window.onPairingScan = (payload: string) => {
      setScanOpen(false);
      handleScannedPayload(payload);
    };
    return () => {
      window.Pairing?.stopScan?.();
      delete window.onPairingScan;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openScanner() {
    setScanError(null);
    // Prefer the native bridge when running inside the APK shell.
    if (window.Pairing?.startScan) {
      window.Pairing.startScan();
      return;
    }
    setScanOpen(true);
  }

  if (alreadyPaired) {
    return <div className="fixed inset-0 bg-[#1a1108]" />;
  }

  return (
    <div className="fixed inset-0 bg-[#1a1108] text-white flex flex-col items-center justify-center px-6">

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
          className="w-full rounded-lg bg-amber-500 py-3 text-sm font-bold tracking-widest text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {m.isPending ? "PAIRING…" : "PAIR"}
        </button>
        <button
          type="button"
          onClick={openScanner}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 py-3 text-sm font-semibold tracking-wide text-white/90 hover:bg-white/10"
        >
          <Camera className="h-4 w-4" /> SCAN QR CODE
        </button>
        {scanError && <p className="text-center text-xs text-red-400">{scanError}</p>}
      </form>

      <div className="mt-8 w-full max-w-xs">
        <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.3em] text-white/30">
          <div className="h-px flex-1 bg-white/10" /> OR <div className="h-px flex-1 bg-white/10" />
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: "/pos/pair-signin" })}
          className="mt-4 w-full rounded-lg border border-amber-400/40 bg-amber-500/10 py-3 text-sm font-semibold tracking-wide text-amber-200 hover:bg-amber-500/20"
        >
          SIGN IN TO PAIR
        </button>
        <p className="mt-2 text-center text-[11px] text-white/40">
          Replacing or resetting a terminal? Sign in with your NectarPay account instead.
        </p>
      </div>

      {scanOpen && (
        <QrScanner
          onClose={() => setScanOpen(false)}
          onResult={(payload) => { setScanOpen(false); handleScannedPayload(payload); }}
          onError={(msg) => { setScanOpen(false); setScanError(msg); }}
        />
      )}
    </div>
  );
}

function QrScanner({
  onResult,
  onClose,
  onError,
}: {
  onResult: (payload: string) => void;
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState("Requesting camera…");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;
    let detector: { detect: (s: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } | null = null;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        onError("Camera not available on this device.");
        return;
      }
      if (!window.BarcodeDetector) {
        onError("This browser can't scan QR codes. Type the code instead.");
        return;
      }
      try {
        detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      } catch {
        onError("QR scanning not supported on this device.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (e) {
        onError((e as Error).message || "Camera permission denied.");
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const v = videoRef.current;
      if (!v) return;
      v.srcObject = stream;
      await v.play().catch(() => {});
      setStatus("Point the camera at the QR code");

      const tick = async () => {
        if (cancelled || !v || !detector) return;
        if (v.readyState >= 2 && v.videoWidth > 0) {
          try {
            const results = await detector.detect(v);
            if (results.length > 0 && results[0].rawValue) {
              onResult(results[0].rawValue);
              return;
            }
          } catch { /* keep looping */ }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onError, onResult]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-3 text-white">
        <span className="text-xs font-bold tracking-[0.3em] text-white/60">SCAN PAIRING QR</span>
        <button
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 hover:bg-white/20"
          aria-label="Close scanner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="size-64 rounded-2xl border-2 border-amber-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
        </div>
        <div className="absolute inset-x-0 bottom-6 text-center text-xs text-white/80">{status}</div>
      </div>
    </div>
  );
}
