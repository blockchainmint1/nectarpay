// /pos — the POS terminal app. Locked-down fullscreen shell, brick-splashes
// if unpaired, optional PIN lock, idle auto-lock, sale flow: amount → tip →
// fullscreen QR → paid.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Settings, History, Lock, X, PenLine, Mail } from "lucide-react";
import { loadCreds, signedJson, type TerminalCreds } from "@/lib/pos-client";
import { loadSettings, sha256, type PosSettings } from "@/lib/pos-settings";
import { EVM_CHAIN_LABEL, evmChainsForStable } from "@/lib/chains/networks";

function joinNets(names: string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

export const Route = createFileRoute("/pos/")({
  head: () => ({
    meta: [
      { title: "Nectar.Pay POS" },
      { name: "viewport", content: "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" },
      { name: "theme-color", content: "#0a0d12" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PosShell,
});

type InvoiceResp = {
  id: string;
  checkout_url: string;
  fiat_amount: number;
  currency: string;
  chain: string | null;
  token_symbol: string | null;
  address: string | null;
  crypto_amount: number | null;
  expires_at: string;
};

type InvoiceStatus = {
  id: string;
  status: "pending" | "detected" | "underpaid" | "confirmed" | "paid" | "overpaid" | "expired" | "cancelled" | "failed";
  chain: string | null;
  crypto_amount: number | null;
  address: string | null;
  tx_hash: string | null;
  paid_at: string | null;
  fiat_amount: number;
  currency: string;
  expires_at: string;
};

type PaymentOption = {
  key: string;
  chain: string;
  tokenSymbol: string | null;
  label: string;
};

function fmt(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

// ─── Shell: pairing-gate + lock-gate ─────────────────────────────────────

function PosShell() {
  const navigate = useNavigate();
  const [creds, setCreds] = useState<TerminalCreds | null>(null);
  const [bootChecked, setBootChecked] = useState(false);
  const [settings, setSettings] = useState<PosSettings>(() => loadSettings());
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const c = loadCreds();
    if (!c) {
      navigate({ to: "/pos/pair" });
      return;
    }
    setCreds(c);
    const s = loadSettings();
    setSettings(s);
    setLocked(!!s.pinHash);
    setBootChecked(true);
  }, [navigate]);

  // Idle auto-lock
  useEffect(() => {
    if (!settings.pinHash || settings.idleLockMs <= 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setLocked(true), settings.idleLockMs);
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, reset)); };
  }, [settings.pinHash, settings.idleLockMs]);

  if (!bootChecked || !creds) {
    return <Splash label="STARTING…" />;
  }
  if (locked && settings.pinHash) {
    return <PinLock pinHash={settings.pinHash} onUnlock={() => setLocked(false)} />;
  }
  return <Sale creds={creds} settings={settings} onLock={() => setLocked(true)} />;
}

function Splash({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0d12] text-white">
      <Lock className="size-8 text-white/40" />
      <p className="mt-3 text-[10px] font-bold tracking-[0.3em] text-white/60">{label}</p>
    </div>
  );
}

function PinLock({ pinHash, onUnlock }: { pinHash: string; onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const press = async (k: string) => {
    if (k === "⌫") return setPin((p) => p.slice(0, -1));
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next); setErr(false);
    if (next.length === 4) {
      const h = await sha256(next);
      if (h === pinHash) onUnlock();
      else { setErr(true); setTimeout(() => setPin(""), 500); }
    }
  };
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0d12] text-white px-6">
      <Lock className="size-10 text-white/40" />
      <p className="mt-3 text-[10px] font-bold tracking-[0.3em] text-white/60">TERMINAL LOCKED</p>
      <div className="mt-6 flex gap-3">
        {[0,1,2,3].map((i) => (
          <span key={i} className={`size-4 rounded-full border-2 ${pin.length > i ? "border-emerald-400 bg-emerald-400" : "border-white/20"}`} />
        ))}
      </div>
      {err && <p className="mt-3 text-xs text-red-400">Wrong PIN</p>}
      <div className="mt-8 grid grid-cols-3 gap-3 w-64">
        {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) =>
          k === "" ? <div key={i} /> : (
            <button key={k} onClick={() => press(k)} className="h-16 rounded-full bg-white/5 text-2xl font-semibold hover:bg-white/10 active:scale-95 transition">
              {k}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─── Sale state machine ──────────────────────────────────────────────────

type Screen = "amount" | "tip" | "chain" | "waiting" | "paid" | "signature" | "email" | "cancelled" | "expired";

interface Experience {
  tip_enabled: boolean;
  signature_enabled: boolean;
  email_receipt_enabled: boolean;
}
const DEFAULT_EXPERIENCE: Experience = { tip_enabled: true, signature_enabled: false, email_receipt_enabled: false };

function Sale({ creds, settings, onLock }: { creds: TerminalCreds; settings: PosSettings; onLock: () => void }) {
  const [screen, setScreen] = useState<Screen>("amount");
  const [subtotalCents, setSubtotalCents] = useState(0);
  const [tipBps, setTipBps] = useState(0);
  const [customTipCents, setCustomTipCents] = useState<number | null>(null);
  const [invoice, setInvoice] = useState<InvoiceResp | null>(null);
  const [status, setStatus] = useState<InvoiceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [options, setOptions] = useState<PaymentOption[] | null>(null);
  const [optionsErr, setOptionsErr] = useState<string | null>(null);
  const [finalTipCents, setFinalTipCents] = useState(0);
  const [experience, setExperience] = useState<Experience>(DEFAULT_EXPERIENCE);

  const taxCents = Math.round((subtotalCents * settings.taxBps) / 10_000);
  const tipCents = customTipCents !== null ? customTipCents : Math.round((subtotalCents * tipBps) / 10_000);
  const totalCents = subtotalCents + taxCents + tipCents;
  const hasTips = experience.tip_enabled && settings.tipPresetsBps.some((b) => b > 0);

  // Fetch the store's enabled chains once on boot so we can show them on the
  // chain-picker screen. Errors are non-fatal — we fall back to "customer picks".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await signedJson<{ options: PaymentOption[]; experience?: Experience }>(
          creds, "/api/public/v1/terminals/options",
        );
        if (cancelled) return;
        setOptions(res.options ?? []);
        if (res.experience) setExperience({ ...DEFAULT_EXPERIENCE, ...res.experience });
      } catch (e) {
        if (!cancelled) setOptionsErr((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [creds]);

  const press = (k: string) => {
    if (k === "C") return setSubtotalCents(0);
    if (k === "⌫") return setSubtotalCents((c) => Math.floor(c / 10));
    if (k === "00") return setSubtotalCents((c) => Math.min(c * 100, 100_000_000));
    setSubtotalCents((c) => Math.min(c * 10 + Number(k), 100_000_000));
  };

  const onChargePress = () => {
    if (subtotalCents <= 0) return;
    if (hasTips) setScreen("tip");
    else goToChainPicker(0);
  };

  // After tip is chosen, move to the chain picker (or skip straight to invoice
  // creation if the store hasn't enabled any chains — preserves old behavior).
  const goToChainPicker = (overrideTipCents?: number) => {
    const finalTip = overrideTipCents ?? tipCents;
    setFinalTipCents(finalTip);
    if (!options || options.length === 0) {
      void createInvoice(finalTip, null);
      return;
    }
    setScreen("chain");
  };

  const createInvoice = async (finalTip: number, option: string | null) => {
    if (subtotalCents <= 0) return;
    setBusy(true); setErr(null);
    try {
      const finalTotal = subtotalCents + taxCents + finalTip;
      const memo = [
        `subtotal:${subtotalCents}`,
        taxCents ? `tax:${taxCents}` : null,
        finalTip ? `tip:${finalTip}` : null,
      ].filter(Boolean).join(" ");
      const inv = await signedJson<InvoiceResp>(creds, "/api/public/v1/terminals/invoice", {
        method: "POST",
        body: { amount_cents: finalTotal, currency: "USD", memo, option },
      });
      setInvoice(inv);
      setScreen("waiting");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Poll status while waiting. After confirmation, advance into the optional
  // signature → email-receipt → final receipt sequence based on store settings.
  useEffect(() => {
    if (screen !== "waiting" || !invoice) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const s = await signedJson<InvoiceStatus>(creds, `/api/public/v1/terminals/invoice/${invoice.id}`);
        if (cancelled) return;
        setStatus(s);
        if (s.status === "paid" || s.status === "confirmed" || s.status === "overpaid") {
          if (experience.signature_enabled) setScreen("signature");
          else if (experience.email_receipt_enabled) setScreen("email");
          else setScreen("paid");
        }
        else if (s.status === "cancelled") setScreen("cancelled");
        else if (s.status === "expired") setScreen("expired");
      } catch { /* keep polling */ }
    };
    void tick();
    const id = setInterval(tick, 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [screen, invoice, creds]);

  const reset = () => {
    setSubtotalCents(0); setTipBps(0); setCustomTipCents(null);
    setInvoice(null); setStatus(null); setErr(null);
    setFinalTipCents(0);
    setScreen("amount");
  };

  const onCancel = async () => {
    if (invoice) {
      try { await signedJson(creds, `/api/public/v1/terminals/invoice/${invoice.id}/cancel`, { method: "POST", body: {} }); } catch { /* ignore */ }
    }
    reset();
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0a0d12] text-white">
      <Header onLock={onLock} hasPin={!!settings.pinHash} />
      <main className="flex min-h-0 flex-1 flex-col">
        {screen === "amount" && (
          <AmountScreen subtotalCents={subtotalCents} taxCents={taxCents} taxBps={settings.taxBps} press={press} onCharge={onChargePress} busy={busy} err={err} />
        )}
        {screen === "tip" && (
          <TipScreen
            subtotalCents={subtotalCents} taxCents={taxCents} tipCents={tipCents} totalCents={totalCents}
            tipBps={tipBps} customTipCents={customTipCents} presetsBps={settings.tipPresetsBps}
            onPickPreset={(bps) => { setTipBps(bps); setCustomTipCents(null); }}
            onPickCustom={(c) => { setTipBps(0); setCustomTipCents(c); }}
            onSkip={() => goToChainPicker(0)} onConfirm={() => goToChainPicker()} onBack={() => setScreen("amount")}
            busy={busy}
          />
        )}
        {screen === "chain" && (
          <ChainScreen
            totalCents={subtotalCents + taxCents + finalTipCents}
            options={options ?? []}
            optionsErr={optionsErr}
            busy={busy}
            err={err}
            onPick={(opt) => createInvoice(finalTipCents, opt)}
            onBack={() => setScreen(hasTips ? "tip" : "amount")}
          />
        )}
        {screen === "waiting" && invoice && (
          <WaitingScreen invoice={invoice} status={status} onCancel={onCancel} />
        )}
        {screen === "signature" && invoice && (
          <SignatureScreen
            onSkip={() => setScreen(experience.email_receipt_enabled ? "email" : "paid")}
            onSubmit={async (dataUrl) => {
              try { await signedJson(creds, `/api/public/v1/terminals/invoice/${invoice.id}/receipt`, { method: "POST", body: { signature_data_url: dataUrl } }); } catch { /* non-fatal */ }
              setScreen(experience.email_receipt_enabled ? "email" : "paid");
            }}
          />
        )}
        {screen === "email" && invoice && (
          <EmailReceiptScreen
            onSkip={() => setScreen("paid")}
            onSubmit={async (email) => {
              try { await signedJson(creds, `/api/public/v1/terminals/invoice/${invoice.id}/receipt`, { method: "POST", body: { email } }); } catch { /* non-fatal */ }
              setScreen("paid");
            }}
          />
        )}
        {screen === "paid" && status && (
          <PaidScreen status={status} onDone={reset} />
        )}
        {screen === "cancelled" && <DoneScreen label="PAYMENT CANCELLED" onDone={reset} />}
        {screen === "expired" && <DoneScreen label="INVOICE EXPIRED" onDone={reset} />}
      </main>
    </div>
  );
}

function Header({ onLock, hasPin }: { onLock: () => void; hasPin: boolean }) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-white/5 bg-black/40 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
        <span className="text-[10px] font-bold tracking-[0.25em] text-emerald-300/90">NECTAR.PAY · POS</span>
      </div>
      <div className="flex items-center gap-1">
        <Link to="/pos/history" className="rounded-md p-1.5 text-white/70 hover:bg-white/10" aria-label="History">
          <History className="size-4" />
        </Link>
        <Link to="/pos/settings" className="rounded-md p-1.5 text-white/70 hover:bg-white/10" aria-label="Settings">
          <Settings className="size-4" />
        </Link>
        {hasPin && (
          <button onClick={onLock} className="rounded-md p-1.5 text-white/70 hover:bg-white/10" aria-label="Lock">
            <Lock className="size-4" />
          </button>
        )}
      </div>
    </header>
  );
}

function AmountScreen({
  subtotalCents, taxCents, taxBps, press, onCharge, busy, err,
}: {
  subtotalCents: number; taxCents: number; taxBps: number;
  press: (k: string) => void; onCharge: () => void; busy: boolean; err: string | null;
}) {
  const keys = useMemo(() => ["1","2","3","4","5","6","7","8","9","00","0","⌫"], []);
  const showTax = taxBps > 0 && subtotalCents > 0;
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <p className="text-[10px] font-bold tracking-[0.25em] text-white/50">{showTax ? "SUBTOTAL" : "AMOUNT DUE"}</p>
        <div className="text-6xl font-black tabular-nums tracking-tight sm:text-7xl">{fmt(subtotalCents)}</div>
        {showTax && (
          <div className="mt-2 text-xs text-white/60 tabular-nums">
            + tax ({(taxBps / 100).toFixed(2)}%): {fmt(taxCents)} ={" "}
            <span className="font-semibold text-white">{fmt(subtotalCents + taxCents)}</span>
          </div>
        )}
        {err && <p className="mt-3 text-center text-xs text-red-400">{err}</p>}
      </div>
      <div className="border-t border-white/5 bg-white/[0.02] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {keys.map((k) => (
            <button key={k} onClick={() => press(k)} className="h-14 rounded-lg bg-white/5 text-2xl font-semibold transition hover:bg-white/10 active:scale-[0.97]">
              {k}
            </button>
          ))}
        </div>
        <div className="mx-auto mt-2 grid max-w-md grid-cols-3 gap-2">
          <button onClick={() => press("C")} className="h-12 rounded-lg border border-white/15 text-xs font-bold tracking-widest text-white/70 hover:bg-white/5">
            CLEAR
          </button>
          <button
            onClick={onCharge}
            disabled={subtotalCents <= 0 || busy}
            className="col-span-2 h-12 rounded-lg bg-emerald-500 text-sm font-bold tracking-widest text-black hover:bg-emerald-400 disabled:opacity-40"
          >
            {busy ? "…" : `CHARGE ${fmt(subtotalCents + taxCents)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function TipScreen({
  subtotalCents, taxCents, tipCents, totalCents, tipBps, customTipCents, presetsBps,
  onPickPreset, onPickCustom, onSkip, onConfirm, onBack, busy,
}: {
  subtotalCents: number; taxCents: number; tipCents: number; totalCents: number;
  tipBps: number; customTipCents: number | null; presetsBps: number[];
  onPickPreset: (bps: number) => void; onPickCustom: (cents: number) => void;
  onSkip: () => void; onConfirm: () => void; onBack: () => void; busy: boolean;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState(0);
  const enabled = presetsBps.filter((b) => b > 0);

  const press = (k: string) => {
    if (k === "C") return setCustomInput(0);
    if (k === "⌫") return setCustomInput((c) => Math.floor(c / 10));
    if (k === "00") return setCustomInput((c) => Math.min(c * 100, 100_000_000));
    setCustomInput((c) => Math.min(c * 10 + Number(k), 100_000_000));
  };
  const keys = ["1","2","3","4","5","6","7","8","9","00","0","⌫"];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-4 text-center">
      <p className="text-[10px] font-bold tracking-[0.25em] text-white/50">ADD A TIP?</p>
      <p className="mt-1 text-xs text-white/60">
        Subtotal {fmt(subtotalCents)}{taxCents > 0 && <> · Tax {fmt(taxCents)}</>}
      </p>
      <div className="mt-2 text-5xl font-black tabular-nums">{fmt(totalCents)}</div>

      {!showCustom ? (
        <>
          <div className="mt-5 grid w-full max-w-md grid-cols-3 gap-2">
            {enabled.map((bps) => {
              const active = tipBps === bps && customTipCents === null;
              return (
                <button
                  key={bps}
                  onClick={() => onPickPreset(bps)}
                  className={`flex h-20 flex-col items-center justify-center rounded-xl border-2 transition ${active ? "border-emerald-400 bg-emerald-400/10" : "border-white/15 hover:border-white/30"}`}
                >
                  <span className="text-2xl font-black">{(bps / 100).toFixed(0)}%</span>
                  <span className="text-[10px] tabular-nums text-white/60">{fmt(Math.round((subtotalCents * bps) / 10_000))}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid w-full max-w-md grid-cols-2 gap-2">
            <button onClick={onSkip} className="h-11 rounded-lg border border-white/15 text-xs font-bold tracking-widest text-white/70 hover:bg-white/5">
              NO TIP
            </button>
            <button onClick={() => { setShowCustom(true); setCustomInput(0); }} className="h-11 rounded-lg border border-white/15 text-xs font-bold tracking-widest text-white/70 hover:bg-white/5">
              CUSTOM
            </button>
          </div>
          <div className="mt-3 grid w-full max-w-md grid-cols-2 gap-2">
            <button onClick={onBack} className="h-11 rounded-lg border border-white/15 text-xs font-bold tracking-widest text-white/60 hover:bg-white/5">
              ← BACK
            </button>
            <button onClick={onConfirm} disabled={busy} className="h-11 rounded-lg bg-emerald-500 text-xs font-bold tracking-widest text-black hover:bg-emerald-400 disabled:opacity-40">
              {busy ? "…" : `CHARGE ${fmt(totalCents)}`}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4 w-full max-w-xs">
          <p className="text-[10px] font-bold tracking-widest text-white/50">CUSTOM TIP</p>
          <div className="mt-1 text-3xl font-black tabular-nums">{fmt(customInput)}</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {keys.map((k) => (
              <button key={k} onClick={() => press(k)} className="h-12 rounded-lg bg-white/5 text-xl font-semibold hover:bg-white/10 active:scale-[0.97]">
                {k}
              </button>
            ))}
          </div>
          <button
            onClick={() => { onPickCustom(customInput); setShowCustom(false); }}
            disabled={customInput <= 0}
            className="mt-3 h-11 w-full rounded-lg bg-emerald-500 text-xs font-bold tracking-widest text-black hover:bg-emerald-400 disabled:opacity-40"
          >
            ADD {fmt(customInput)} TIP
          </button>
          <button onClick={() => setShowCustom(false)} className="mt-2 text-[10px] font-bold tracking-widest text-white/50">
            CANCEL
          </button>
        </div>
      )}
    </div>
  );
}

function ChainScreen({
  totalCents, options, optionsErr, busy, err, onPick, onBack,
}: {
  totalCents: number;
  options: PaymentOption[];
  optionsErr: string | null;
  busy: boolean;
  err: string | null;
  onPick: (option: string | null) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col px-4 py-4">
      <div className="flex-shrink-0 text-center">
        <p className="text-[10px] font-bold tracking-[0.25em] text-white/50">CUSTOMER PAYS WITH</p>
        <div className="mt-1 text-4xl font-black tabular-nums">{fmt(totalCents)}</div>
      </div>

      <div className="mx-auto mt-5 flex w-full max-w-md min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {optionsErr && (
          <p className="text-center text-xs text-red-400">Couldn't load chains: {optionsErr}</p>
        )}
        {options.length === 0 && !optionsErr && (
          <p className="text-center text-xs text-white/50">
            No chains enabled for this store yet. Customer will pick on their phone.
          </p>
        )}
        {options.map((opt) => (
          <button
            key={opt.key}
            disabled={busy}
            onClick={() => onPick(opt.key)}
            className="group flex w-full items-center justify-between rounded-xl border-2 border-white/15 bg-white/[0.03] px-4 py-4 text-left transition hover:border-emerald-400/60 hover:bg-emerald-400/[0.05] disabled:opacity-40"
          >
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold">{opt.label}</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
                {opt.tokenSymbol ? `${opt.tokenSymbol} · ${opt.chain}` : opt.chain}
              </div>
            </div>
            <span className="ml-3 text-white/40 group-hover:text-emerald-300">→</span>
          </button>
        ))}

        {/* Pinned at the bottom: hand the choice to the customer on the QR page. */}
        <div className="mt-2 border-t border-white/10 pt-2">
          <button
            disabled={busy}
            onClick={() => onPick(null)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-dashed border-white/15 bg-transparent px-4 py-4 text-left transition hover:border-white/40 hover:bg-white/[0.03] disabled:opacity-40"
          >
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold">Choose on Device</div>
              <div className="mt-0.5 text-[11px] text-white/50">
                Shows a QR that opens a chooser on the customer's phone.
              </div>
            </div>
            <span className="ml-3 text-white/40">→</span>
          </button>
        </div>

        {err && <p className="mt-2 text-center text-xs text-red-400">{err}</p>}
      </div>

      <div className="mx-auto mt-3 w-full max-w-md flex-shrink-0">
        <button
          onClick={onBack}
          disabled={busy}
          className="h-11 w-full rounded-lg border border-white/15 text-xs font-bold tracking-widest text-white/60 hover:bg-white/5 disabled:opacity-40"
        >
          ← BACK
        </button>
      </div>
    </div>
  );
}


function paymentUri(chain: string, address: string, amount: number | null, tokenSymbol: string | null): string {
  if (chain === "btc") return `bitcoin:${address}${amount ? `?amount=${amount}` : ""}`;
  if (chain === "txc") return `texitcoin:${address}${amount ? `?amount=${amount}` : ""}`;
  if (chain === "doge") return `dogecoin:${address}${amount ? `?amount=${amount}` : ""}`;
  if (chain === "eth" || chain === "base" || chain === "bsc") return `ethereum:${address}`;
  if (chain === "tron") return `tron:${address}`;
  if (chain === "sol") {
    const params = new URLSearchParams();
    if (amount) params.set("amount", String(amount));
    if (tokenSymbol) params.set("spl-token", tokenSymbol);
    params.set("label", "Nectar.Pay");
    const qs = params.toString();
    return `solana:${address}${qs ? `?${qs}` : ""}`;
  }
  return address;
}

function WaitingScreen({
  invoice, status, onCancel,
}: { invoice: InvoiceResp; status: InvoiceStatus | null; onCancel: () => void }) {
  const expiresMs = new Date(invoice.expires_at).getTime();
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresMs - Date.now()));
  const [addressOnly, setAddressOnly] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, expiresMs - Date.now())), 1000);
    return () => clearInterval(id);
  }, [expiresMs]);

  const hasWallet = !!(invoice.chain && invoice.address);
  const assetLabel = (() => {
    const chain = invoice.chain;
    const token = invoice.token_symbol;
    if (!chain) return "";
    if (chain === "eth") {
      // Native or stable on an EVM chain — address is valid on all EVM chains
      // the wallet supports for that asset.
      const nets = token
        ? evmChainsForStable(token).map((k) => EVM_CHAIN_LABEL[k].toUpperCase())
        : ["ETH", "BASE", "BSC"];
      if (token) return `${token} on ${joinNets(nets)}`;
      return joinNets(nets);
    }
    return token ? `${token} on ${chain.toUpperCase()}` : chain.toUpperCase();
  })();

  // Build the QR value: wallet URI when chain pre-selected, else checkout page.
  const qrValue = useMemo(() => {
    if (!hasWallet) return invoice.checkout_url;
    if (addressOnly) return invoice.address!;
    return paymentUri(invoice.chain!, invoice.address!, invoice.crypto_amount, invoice.token_symbol);
  }, [hasWallet, addressOnly, invoice]);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(qrValue, { width: 640, margin: 1, color: { dark: "#000", light: "#fff" } })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [qrValue]);

  const mm = Math.floor(remaining / 60_000);
  const ss = Math.floor((remaining % 60_000) / 1000).toString().padStart(2, "0");
  const detected = status && (status.status === "detected" || status.status === "underpaid");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-3 text-center">
      <p className="text-[10px] font-bold tracking-[0.25em] text-white/50">
        {hasWallet ? "SEND PAYMENT" : "SCAN TO PAY"}
      </p>
      <div className="mt-1 text-3xl font-black tabular-nums">{fmt(invoice.fiat_amount * 100, invoice.currency)}</div>
      {hasWallet && invoice.crypto_amount != null && (
        <div className="mt-0.5 text-xs font-mono text-white/70">
          {invoice.crypto_amount} {invoice.token_symbol ?? invoice.chain?.toUpperCase()}
        </div>
      )}

      {qrDataUrl && (
        <div className="mt-3 rounded-xl bg-white p-3 shadow-2xl">
          <img src={qrDataUrl} alt="Scan to pay" className="aspect-square w-[min(58vw,300px)]" />
        </div>
      )}
      {hasWallet && invoice.address && (
        <button
          type="button"
          onClick={() => { void navigator.clipboard?.writeText(invoice.address!); }}
          className="mt-2 max-w-[min(58vw,300px)] break-all font-mono text-[9px] leading-snug text-white/55 hover:text-white/80"
          title="Tap to copy"
        >
          {invoice.address}
        </button>
      )}

      <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-white/60">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
        </span>
        {detected ? `detected · ${status?.chain ?? ""}` : `listening · ${mm}:${ss}`}
      </div>

      {hasWallet ? (
        <>
          <div className="mt-3 w-full max-w-sm rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[11px] font-bold text-amber-200">
            ⚠ ONLY SEND {assetLabel} TO THIS ADDRESS
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-white/70">
            <input
              type="checkbox"
              checked={!addressOnly}
              onChange={(e) => setAddressOnly(!e.target.checked)}
              className="size-4 accent-emerald-400"
            />
            Include amount &amp; token in QR
          </label>
        </>
      ) : (
        <p className="mt-2 max-w-xs text-[11px] text-white/50">
          Customer scans with any wallet and picks their chain on their phone.
        </p>
      )}

      <button onClick={onCancel} className="mt-3 h-11 rounded-lg border border-white/15 px-8 text-xs font-bold tracking-widest text-white/70 hover:bg-white/5">
        CANCEL
      </button>
    </div>
  );
}

function PaidScreen({ status, onDone }: { status: InvoiceStatus; onDone: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-4 text-center">
      <div className="flex size-20 items-center justify-center rounded-full border-2 border-emerald-400/40 bg-emerald-400/15">
        <svg viewBox="0 0 24 24" className="size-10 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="mt-4 text-[10px] font-bold tracking-[0.25em] text-emerald-300">PAYMENT RECEIVED</p>
      <div className="mt-1 text-4xl font-black tabular-nums">{fmt(status.fiat_amount * 100, status.currency)}</div>
      {status.chain && (
        <p className="text-[10px] tracking-widest text-white/60">via {status.chain.toUpperCase()}</p>
      )}
      {status.tx_hash && (
        <div className="mt-4 w-full max-w-sm rounded-md border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[9px] font-bold tracking-widest text-white/50">TX HASH</p>
          <p className="mt-0.5 break-all font-mono text-[10px] leading-snug text-white/80">{status.tx_hash}</p>
        </div>
      )}
      <button onClick={onDone} className="mt-6 h-12 rounded-lg bg-emerald-500 px-10 text-sm font-bold tracking-widest text-black hover:bg-emerald-400">
        NEW SALE
      </button>
    </div>
  );
}

function DoneScreen({ label, onDone }: { label: string; onDone: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-4 text-center">
      <X className="size-10 text-white/40" />
      <p className="mt-3 text-[10px] font-bold tracking-[0.25em] text-white/60">{label}</p>
      <button onClick={onDone} className="mt-4 h-12 rounded-lg bg-emerald-500 px-10 text-sm font-bold tracking-widest text-black hover:bg-emerald-400">
        NEW SALE
      </button>
    </div>
  );
}

function SignatureScreen({ onSubmit, onSkip }: { onSubmit: (dataUrl: string) => void | Promise<void>; onSkip: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const dirtyRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = c.getBoundingClientRect();
    c.width = Math.floor(rect.width * dpr);
    c.height = Math.floor(rect.height * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0a0d12";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault(); (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastRef.current = pointFromEvent(e);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const last = lastRef.current;
    if (!ctx || !last) return;
    const p = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    if (!dirtyRef.current) { dirtyRef.current = true; setHasInk(true); }
  }
  function up() { drawingRef.current = false; lastRef.current = null; }
  function clear() {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const rect = c.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    dirtyRef.current = false; setHasInk(false);
  }
  async function submit() {
    if (!canvasRef.current || !hasInk || submitting) return;
    setSubmitting(true);
    const dataUrl = canvasRef.current.toDataURL("image/png");
    await onSubmit(dataUrl);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-4 text-center">
      <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] text-emerald-300">
        <PenLine className="size-3.5" /> SIGN BELOW
      </div>
      <p className="mt-1 max-w-xs text-[11px] text-white/50">Customer signs to confirm receipt.</p>
      <div className="mt-4 w-full max-w-md flex-1 max-h-[50vh]">
        <canvas
          ref={canvasRef}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="block h-full w-full touch-none rounded-xl bg-white"
        />
      </div>
      <div className="mt-4 grid w-full max-w-md grid-cols-3 gap-2">
        <button onClick={onSkip} className="h-11 rounded-lg border border-white/15 text-xs font-bold tracking-widest text-white/60 hover:bg-white/5">SKIP</button>
        <button onClick={clear} className="h-11 rounded-lg border border-white/15 text-xs font-bold tracking-widest text-white/60 hover:bg-white/5">CLEAR</button>
        <button onClick={submit} disabled={!hasInk || submitting} className="h-11 rounded-lg bg-emerald-500 text-xs font-bold tracking-widest text-black hover:bg-emerald-400 disabled:opacity-40">
          {submitting ? "…" : "DONE"}
        </button>
      </div>
    </div>
  );
}

function EmailReceiptScreen({ onSubmit, onSkip }: { onSubmit: (email: string) => void | Promise<void>; onSkip: () => void }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function go() {
    if (!valid || submitting) return;
    setSubmitting(true);
    await onSubmit(email.trim().toLowerCase());
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-6 text-center">
      <Mail className="size-8 text-emerald-300" />
      <p className="mt-3 text-[10px] font-bold tracking-[0.25em] text-emerald-300">EMAIL RECEIPT</p>
      <p className="mt-1 max-w-xs text-[11px] text-white/50">Optional — enter the customer's email to send them a copy.</p>

      <form onSubmit={(e) => { e.preventDefault(); void go(); }} className="mt-5 w-full max-w-sm">
        <input
          autoFocus
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@example.com"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-center text-base lowercase placeholder:text-white/20 focus:border-emerald-400 focus:outline-none"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onSkip} className="h-11 rounded-lg border border-white/15 text-xs font-bold tracking-widest text-white/60 hover:bg-white/5">
            SKIP
          </button>
          <button type="submit" disabled={!valid || submitting} className="h-11 rounded-lg bg-emerald-500 text-xs font-bold tracking-widest text-black hover:bg-emerald-400 disabled:opacity-40">
            {submitting ? "…" : "SEND"}
          </button>
        </div>
      </form>
    </div>
  );
}

