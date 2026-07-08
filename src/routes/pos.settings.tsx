// /pos/settings — tax %, tip presets, PIN, idle auto-lock.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { loadSettings, saveSettings, sha256, type PosSettings } from "@/lib/pos-settings";
import { clearCreds } from "@/lib/pos-client";
import { checkForUpdate, downloadUpdate, type UpdateStatus } from "@/lib/pos-updater";
import { openPosDebugLog } from "@/lib/pos-debug-log";
import { Tangem, isNative } from "@/lib/pos-native";
import { LOCAL_BUILD_ID, fetchServerBuildId, hardRefreshPos } from "@/lib/pos-build-id";


export const Route = createFileRoute("/pos/settings")({
  head: () => ({
    meta: [
      { title: "Terminal settings · Nectar.Pay POS" },
      { name: "viewport", content: "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" },
      { name: "theme-color", content: "#1a1108" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<PosSettings>(() => loadSettings());
  const [pinMode, setPinMode] = useState<"keep" | "set" | "clear">("keep");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saved, setSaved] = useState(false);
  const [update, setUpdate] = useState<UpdateStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [serverBuild, setServerBuild] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);


  // Auto-check once on mount so the button shows "Update available" without
  // requiring a manual tap first.
  useEffect(() => {
    let cancelled = false;
    checkForUpdate().then((s) => { if (!cancelled) setUpdate(s); });
    fetchServerBuildId().then((b) => { if (!cancelled) setServerBuild(b); });
    return () => { cancelled = true; };
  }, []);

  const webStale = !!serverBuild && serverBuild !== LOCAL_BUILD_ID;

  const runForceRefresh = async () => {
    setRefreshing(true);
    toast.info("Clearing cache and reloading…");
    await hardRefreshPos();
  };


  const runCheck = async () => {
    setChecking(true);
    try {
      const s = await checkForUpdate();
      setUpdate(s);
      if (s.error) {
        toast.error(`Update check failed: ${s.error}`);
      } else if (!s.supported) {
        toast.info("Update checks only run inside the installed app.");
      } else if (s.updateAvailable) {
        toast.success(`Update available: v${s.latestVersion} (installed v${s.currentVersion ?? "?"})`);
      } else {
        toast.success(`Up to date — v${s.currentVersion ?? s.latestVersion ?? "?"} is the latest.`);
      }
    } finally { setChecking(false); }
  };

  const runDownload = async () => {
    if (!update?.downloadUrl) return;
    setDownloading(true);
    try { await downloadUpdate(update.downloadUrl); }
    finally { setDownloading(false); }
  };

  const submit = async () => {
    const next = { ...draft };
    if (pinMode === "clear") next.pinHash = null;
    else if (pinMode === "set") {
      if (!/^\d{4}$/.test(newPin)) return alert("PIN must be 4 digits");
      if (newPin !== confirmPin) return alert("PINs don't match");
      next.pinHash = await sha256(newPin);
    }
    saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const unpair = () => {
    if (!confirm("Unpair this device? You'll need a new pairing code to use it again.")) return;
    clearCreds();
    navigate({ to: "/pos/pair" });
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#1a1108] text-white">
      <div className="mx-auto w-full max-w-md px-5 py-6">
        <button onClick={() => navigate({ to: "/pos" })} className="text-xs font-bold tracking-widest text-white/60 hover:text-white">
          ← BACK
        </button>
        <h1 className="mt-2 text-xl font-bold">Terminal settings</h1>

        <div className="mt-6 space-y-6">
          <Field label="Tax rate (%)">
            <input
              type="number" step="0.01" min="0" max="50"
              value={(draft.taxBps / 100).toString()}
              onChange={(e) => setDraft({ ...draft, taxBps: Math.round(parseFloat(e.target.value || "0") * 100) })}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Tip presets (%)">
            <div className="flex gap-2">
              {draft.tipPresetsBps.map((bps, i) => (
                <input
                  key={i}
                  type="number" step="1" min="0" max="100"
                  value={(bps / 100).toString()}
                  onChange={(e) => {
                    const next = [...draft.tipPresetsBps];
                    next[i] = Math.round(parseFloat(e.target.value || "0") * 100);
                    setDraft({ ...draft, tipPresetsBps: next });
                  }}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-center text-sm"
                />
              ))}
            </div>
            <p className="mt-1 text-[10px] text-white/50">Set a preset to 0 to hide it. "No tip" is always offered.</p>
          </Field>

          <Field label="Auto-lock after">
            <select
              value={draft.idleLockMs}
              onChange={(e) => setDraft({ ...draft, idleLockMs: Number(e.target.value) })}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm"
            >
              <option value={0}>Never</option>
              <option value={60_000}>1 minute</option>
              <option value={3 * 60_000}>3 minutes</option>
              <option value={5 * 60_000}>5 minutes</option>
              <option value={15 * 60_000}>15 minutes</option>
            </select>
          </Field>

          <Field label="PIN lock">
            <div className="flex gap-2 text-xs">
              <button onClick={() => setPinMode("keep")} className={`flex-1 h-9 rounded-lg border ${pinMode === "keep" ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-white/15 text-white/70"}`}>
                {draft.pinHash ? "Keep current" : "No PIN"}
              </button>
              <button onClick={() => setPinMode("set")} className={`flex-1 h-9 rounded-lg border ${pinMode === "set" ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-white/15 text-white/70"}`}>
                Set new
              </button>
              {draft.pinHash && (
                <button onClick={() => setPinMode("clear")} className={`flex-1 h-9 rounded-lg border ${pinMode === "clear" ? "border-red-400 bg-red-400/10 text-red-300" : "border-white/15 text-white/70"}`}>
                  Clear
                </button>
              )}
            </div>
            {pinMode === "set" && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                  value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="4-digit PIN"
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-sm"
                />
                <input
                  type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}
                  value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Confirm"
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-sm"
                />
              </div>
            )}
          </Field>
        </div>

        <button
          onClick={submit}
          className="mt-6 h-12 w-full rounded-lg bg-amber-500 text-sm font-bold tracking-widest text-black hover:bg-amber-400"
        >
          {saved ? "SAVED ✓" : "SAVE"}
        </button>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-[10px] font-bold tracking-widest text-white/40">DIAGNOSTICS</p>
          <p className="mt-1 text-[11px] text-white/50">Hardware self-tests. Safe to run — no charges, no invoices.</p>
          <div className="mt-3 grid gap-2">
            <button
              onClick={() => navigate({ to: "/pos/nfc-inspect" })}
              className="h-11 w-full rounded-lg border border-white/15 bg-white/5 text-xs font-bold tracking-widest text-white/80 hover:bg-white/10"
            >
              NFC INSPECTOR →
            </button>
            <button
              onClick={() => navigate({ to: "/pos/printer-test" })}
              className="h-11 w-full rounded-lg border border-white/15 bg-white/5 text-xs font-bold tracking-widest text-white/80 hover:bg-white/10"
            >
              PRINTER TEST →
            </button>
            <button
              onClick={async () => {
                console.info("[tangem-diag] isNative:", isNative(), "isAvailable:", Tangem.isAvailable());
                if (!Tangem.isAvailable()) {
                  toast.error("Tangem plugin NOT registered on this build.");
                  openPosDebugLog();
                  return;
                }
                try {
                  toast.info("Tap Tangem card to phone…");
                  const card = await Tangem.scan();
                  console.info("[tangem-diag] scan OK:", card);
                  toast.success(`Card OK · ${card.ethAddress.slice(0, 10)}…`);
                } catch (e) {
                  console.error("[tangem-diag] scan failed:", e);
                  toast.error(`Scan failed: ${(e as Error).message}`);
                  openPosDebugLog();
                }
              }}
              className="h-11 w-full rounded-lg border border-white/15 bg-white/5 text-xs font-bold tracking-widest text-white/80 hover:bg-white/10"
            >
              TANGEM SCAN TEST →
            </button>
            <button
              onClick={() => openPosDebugLog()}
              className="h-11 w-full rounded-lg border border-amber-400/40 bg-amber-400/10 text-xs font-bold tracking-widest text-amber-300 hover:bg-amber-400/20"
            >
              SHOW DEBUG LOG →
            </button>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-[10px] font-bold tracking-widest text-white/40">WEB BUILD</p>
          <p className="mt-1 text-[11px] text-white/50">
            Live UI served by the terminal WebView. If it drifts from what's deployed, force a refresh to clear the cache.
          </p>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-white/60">Running</span>
            <span className="font-mono text-white/90">{LOCAL_BUILD_ID.slice(-10)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-white/60">Server</span>
            <span className={`font-mono ${webStale ? "text-amber-300" : "text-white/90"}`}>
              {serverBuild ? serverBuild.slice(-10) : "…"}
            </span>
          </div>
          {webStale && (
            <p className="mt-2 text-[11px] text-amber-300">
              A newer web build is available. Reload to pick it up.
            </p>
          )}
          <button
            onClick={runForceRefresh}
            disabled={refreshing}
            className={`mt-3 h-11 w-full rounded-lg text-xs font-bold tracking-widest disabled:opacity-50 ${
              webStale
                ? "bg-amber-500 text-black hover:bg-amber-400"
                : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            {refreshing ? "RELOADING…" : webStale ? "RELOAD TO LATEST" : "FORCE REFRESH"}
          </button>
        </div>


        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-[10px] font-bold tracking-widest text-white/40">APP VERSION</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-white/60">Installed</span>
            <span className="font-mono text-white/90">{update?.currentVersion ?? (update?.supported ? "…" : "web preview")}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-white/60">Latest</span>
            <span className="font-mono text-white/90">{update?.latestVersion ?? "…"}</span>
          </div>
          {update?.publishedAt && (
            <p className="mt-1 text-[10px] text-white/40">
              Published {new Date(update.publishedAt).toLocaleDateString()}
            </p>
          )}
          {update?.notes && (
            <p className="mt-2 whitespace-pre-wrap rounded-md bg-white/5 p-2 text-[11px] text-white/70">
              {update.notes}
            </p>
          )}
          {update?.error && (
            <p className="mt-2 text-[11px] text-red-400">Couldn't check: {update.error}</p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={runCheck}
              disabled={checking}
              className="h-11 rounded-lg border border-white/15 bg-white/5 text-xs font-bold tracking-widest text-white/80 hover:bg-white/10 disabled:opacity-50"
            >
              {checking ? "CHECKING…" : "CHECK FOR UPDATES"}
            </button>
            <button
              onClick={runDownload}
              disabled={!update?.downloadUrl || downloading}
              className="h-11 rounded-lg bg-amber-500 text-xs font-bold tracking-widest text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
            >
              {downloading
                ? "OPENING…"
                : update?.supported
                  ? update?.updateAvailable ? `UPDATE TO ${update.latestVersion}` : `REINSTALL v${update?.latestVersion ?? ""}`
                  : "DOWNLOAD APK"}
            </button>
          </div>
          {update?.supported && (
            <p className="mt-2 text-[10px] text-white/40">
              Tapping update opens Chrome to download the APK — Android will prompt you to install.
              You may need to allow "Install unknown apps" for Chrome the first time.
            </p>
          )}
        </div>


        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-[10px] font-bold tracking-widest text-white/40">DANGER ZONE</p>
          <button
            onClick={unpair}
            className="mt-2 h-11 w-full rounded-lg border border-red-500/50 text-xs font-bold tracking-widest text-red-400 hover:bg-red-500/10"
          >
            UNPAIR THIS DEVICE
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold tracking-[0.2em] text-white/50">{label.toUpperCase()}</label>
      {children}
    </div>
  );
}
