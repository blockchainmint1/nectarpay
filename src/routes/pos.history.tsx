// /pos/history — recent invoices for this terminal's store.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { loadCreds, signedJson, type TerminalCreds } from "@/lib/pos-client";

export const Route = createFileRoute("/pos/history")({
  head: () => ({
    meta: [
      { title: "History · Nectar.Pay POS" },
      { name: "viewport", content: "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" },
      { name: "theme-color", content: "#1a1108" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryPage,
});

type Row = {
  id: string;
  fiat_amount: number;
  fiat_currency: string;
  status: string;
  chain: string | null;
  token_symbol: string | null;
  crypto_amount: number | null;
  external_order_id: string | null;
  created_at: string;
};

const PAID = new Set(["confirmed", "detected", "overpaid"]);

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function HistoryPage() {
  const navigate = useNavigate();
  const [creds, setCreds] = useState<TerminalCreds | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = loadCreds();
    if (!c) {
      navigate({ to: "/pos/pair" });
      return;
    }
    setCreds(c);
  }, [navigate]);

  const load = useCallback(async (c: TerminalCreds) => {
    setBusy(true);
    setError(null);
    try {
      const res = await signedJson<{ invoices: Row[] }>(c, "/api/public/v1/terminals/invoices?limit=50");
      setRows(res.invoices ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sales");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (creds) void load(creds);
  }, [creds, load]);

  const paidTotal = (rows ?? [])
    .filter((r) => PAID.has(r.status))
    .reduce((sum, r) => sum + Number(r.fiat_amount || 0), 0);

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#1a1108] text-white">
      <div className="mx-auto w-full max-w-md px-5 py-6 pb-24">
        <div className="flex items-center justify-between">
          <Link to="/pos" className="inline-flex items-center text-xs font-bold tracking-widest text-white/60 hover:text-white">
            <ChevronLeft className="size-4" /> BACK
          </Link>
          <button
            type="button"
            onClick={() => creds && load(creds)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold tracking-widest text-white/70 disabled:opacity-40"
          >
            <RefreshCw className={"size-3.5 " + (busy ? "animate-spin" : "")} /> REFRESH
          </button>
        </div>

        <h1 className="mt-3 text-xl font-bold">Recent sales</h1>
        {rows && (
          <p className="mt-1 text-sm text-white/50">
            {rows.filter((r) => PAID.has(r.status)).length} paid · {money(paidTotal, rows[0]?.fiat_currency ?? "USD")}
          </p>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        )}

        {!rows && !error && <p className="mt-6 text-sm text-white/50">Loading…</p>}

        {rows && rows.length === 0 && !error && (
          <p className="mt-6 text-sm text-white/50">No sales yet. Take your first payment from the keypad.</p>
        )}

        {rows && rows.length > 0 && (
          <ul className="mt-5 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{money(Number(r.fiat_amount), r.fiat_currency)}</p>
                  <p className="truncate text-[11px] text-white/45">
                    {new Date(r.created_at).toLocaleString()}
                    {r.token_symbol || r.chain ? ` · ${r.token_symbol ?? ""}${r.token_symbol && r.chain ? " on " : ""}${r.chain?.toUpperCase() ?? ""}` : ""}
                    {r.external_order_id ? ` · #${r.external_order_id}` : ""}
                  </p>
                </div>
                <span
                  className={
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider " +
                    (PAID.has(r.status)
                      ? "bg-emerald-400/15 text-emerald-300"
                      : r.status === "pending"
                        ? "bg-amber-400/15 text-amber-300"
                        : "bg-white/10 text-white/50")
                  }
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
