// In-app debug log overlay for the POS terminal.
//
// Captures console.log/info/warn/error + window.onerror + unhandledrejection
// into a small ring buffer, and exposes a hidden button to view them on
// device (Android APK has no easy way to see console output without adb).
//
// Trigger: tap the top-left corner of the header 5 times within 3 seconds.

import { useEffect, useRef, useState } from "react";

type Entry = { t: number; level: "log" | "info" | "warn" | "error"; msg: string };

const BUF: Entry[] = [];
const MAX = 300;
let installed = false;

function push(level: Entry["level"], args: unknown[]) {
  let msg = "";
  try {
    msg = args.map((a) => {
      if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack ?? ""}`;
      if (typeof a === "string") return a;
      try { return JSON.stringify(a); } catch { return String(a); }
    }).join(" ");
  } catch { msg = "[unserializable]"; }
  BUF.push({ t: Date.now(), level, msg });
  if (BUF.length > MAX) BUF.shift();
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const orig = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  console.log = (...a: unknown[]) => { push("log", a); orig.log(...a); };
  console.info = (...a: unknown[]) => { push("info", a); orig.info(...a); };
  console.warn = (...a: unknown[]) => { push("warn", a); orig.warn(...a); };
  console.error = (...a: unknown[]) => { push("error", a); orig.error(...a); };
  window.addEventListener("error", (e) => {
    push("error", [`window.error: ${e.message}`, e.filename, `${e.lineno}:${e.colno}`, e.error]);
  });
  window.addEventListener("unhandledrejection", (e) => {
    push("error", [`unhandledrejection:`, e.reason]);
  });
  push("info", [`debug log installed @ ${new Date().toISOString()} · ${navigator.userAgent}`]);
}

export function openPosDebugLog() {
  if (typeof window !== "undefined") {
    (window as unknown as { __posDebugOpen?: () => void }).__posDebugOpen?.();
  }
}

export function PosDebugLog() {
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  const taps = useRef<number[]>([]);

  useEffect(() => { install(); }, []);

  useEffect(() => {
    (window as unknown as { __posDebugOpen?: () => void }).__posDebugOpen = () => setOpen(true);
    return () => {
      delete (window as unknown as { __posDebugOpen?: () => void }).__posDebugOpen;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [open]);

  const onCorner = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2000), now];
    if (taps.current.length >= 3) {
      taps.current = [];
      setOpen(true);
    }
  };

  return (
    <>
      {/* Corner tap-target: bottom-right, faint dot. Tap 3× within 2s. */}
      <button
        onClick={onCorner}
        aria-label="Debug log"
        className="fixed bottom-1 right-1 z-[9998] size-8 rounded-full bg-white/5 text-[10px] text-white/30 hover:bg-white/10"
      >···</button>
      {open && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black text-white">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <div className="text-xs font-bold tracking-widest">POS DEBUG LOG · {BUF.length}</div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const text = BUF.map((e) => `[${new Date(e.t).toISOString()}] ${e.level.toUpperCase()} ${e.msg}`).join("\n");
                  navigator.clipboard?.writeText(text).catch(() => {});
                }}
                className="rounded bg-white/10 px-2 py-1 text-xs"
              >Copy</button>
              <button
                onClick={() => { BUF.length = 0; force((n) => n + 1); }}
                className="rounded bg-white/10 px-2 py-1 text-xs"
              >Clear</button>
              <button
                onClick={() => setOpen(false)}
                className="rounded bg-amber-400 px-3 py-1 text-xs font-bold text-black"
              >Close</button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2 font-mono text-[10px] leading-tight">
            {BUF.length === 0 && <div className="text-white/40">No logs yet.</div>}
            {BUF.map((e, i) => (
              <div
                key={i}
                className={
                  e.level === "error" ? "text-red-400"
                  : e.level === "warn" ? "text-amber-300"
                  : e.level === "info" ? "text-sky-300"
                  : "text-white/80"
                }
              >
                <span className="text-white/40">{new Date(e.t).toLocaleTimeString()}</span>{" "}
                <span className="uppercase">{e.level}</span>{" "}
                <span className="whitespace-pre-wrap break-all">{e.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
