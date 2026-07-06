// /pos/printer-test — hidden diagnostic. Fires various print jobs so you
// can verify the thermal printer without running a real sale.
//
// Reachable from /pos/settings → Diagnostics, and by direct URL.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NectarPrinter, isNative, type ReceiptPayload } from "@/lib/pos-native";

export const Route = createFileRoute("/pos/printer-test")({
  head: () => ({
    meta: [
      { title: "Printer test · Nectar.Pay POS" },
      { name: "viewport", content: "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" },
      { name: "theme-color", content: "#1a1108" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrinterTest,
});

function PrinterTest() {
  const navigate = useNavigate();
  const [native, setNative] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNative(isNative());
    NectarPrinter.isAvailable().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  const say = (msg: string) => setLog((l) => [`${new Date().toLocaleTimeString()} · ${msg}`, ...l].slice(0, 40));

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    say(`${label}…`);
    try {
      await fn();
      say(`${label} ✓`);
    } catch (e) {
      say(`${label} ✗ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const alignmentTest: ReceiptPayload = {
    header: "ALIGNMENT",
    lines: [
      { text: "Left", right: "Right" },
      { text: "Bold line", bold: true },
      { text: "Large", size: 2 },
      { divider: true },
      { text: "1234567890 " + "1234567890 ".repeat(2) },
      { text: "Item", right: "$0.01" },
      { text: "Tax", right: "$0.00" },
      { divider: true },
      { text: "TOTAL", right: "$0.01", bold: true, size: 2 },
    ],
    footer: "End of alignment test",
  };

  const qrTest: ReceiptPayload = {
    header: "QR TEST",
    lines: [{ text: "Scan below" }],
    qr: "https://nectar-pay.com/pos",
    footer: "nectar-pay.com/pos",
  };

  const receiptTest: ReceiptPayload = {
    header: "Nectar.Pay — TEST",
    lines: [
      { text: "Sample receipt" },
      { text: "Store", right: "Diagnostic" },
      { text: "Terminal", right: "self-test" },
      { divider: true },
      { text: "Espresso", right: "$3.50" },
      { text: "Croissant", right: "$4.25" },
      { divider: true },
      { text: "Subtotal", right: "$7.75" },
      { text: "Tax", right: "$0.62" },
      { text: "TOTAL", right: "$8.37", bold: true },
    ],
    qr: "https://nectar-pay.com/i/test",
    footer: "Thanks — this is a test print",
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#1a1108] text-white">
      <div className="mx-auto w-full max-w-md px-5 py-6">
        <button onClick={() => navigate({ to: "/pos/settings" })} className="text-xs font-bold tracking-widest text-white/60 hover:text-white">
          ← BACK
        </button>
        <h1 className="mt-2 text-xl font-bold">Printer test</h1>
        <p className="mt-1 text-xs text-white/50">
          {native ? (available == null ? "Checking printer…" : available ? "Printer detected" : "No printer on this device") : "Browser mode — no printer hardware"}
        </p>

        <div className="mt-6 grid gap-2">
          <TestButton disabled={busy || !available} onClick={() => run("Feed 3 lines", () => NectarPrinter.feed(3))}>
            Feed 3 lines
          </TestButton>
          <TestButton disabled={busy || !available} onClick={() => run("Alignment test", () => NectarPrinter.printReceipt(alignmentTest))}>
            Alignment / bold / size
          </TestButton>
          <TestButton disabled={busy || !available} onClick={() => run("QR test", () => NectarPrinter.printReceipt(qrTest))}>
            QR code
          </TestButton>
          <TestButton disabled={busy || !available} onClick={() => run("Sample receipt", () => NectarPrinter.printReceipt(receiptTest))}>
            Full sample receipt
          </TestButton>
        </div>

        <div className="mt-6">
          <p className="text-[10px] font-bold tracking-widest text-white/40">LOG</p>
          <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[11px]">
            {log.length === 0 ? <span className="text-white/40">no activity yet</span> : log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function TestButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="h-12 w-full rounded-lg border border-white/15 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
