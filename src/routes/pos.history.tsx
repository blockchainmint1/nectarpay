// /pos/history — recent invoices created from this terminal's store.
//
// The terminal's API isn't scoped per-terminal (the store could have many),
// but we tag every invoice description with "terminal:<id>" so we can filter.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { loadCreds, signedJson, type TerminalCreds } from "@/lib/pos-client";

export const Route = createFileRoute("/pos/history")({
  head: () => ({
    meta: [
      { title: "History · Nectar.Pay POS" },
      { name: "viewport", content: "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" },
      { name: "theme-color", content: "#0a0d12" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryPage,
});

// We don't have a dedicated list endpoint yet — for v1 the history page is
// intentionally minimal and links the cashier back to the dashboard.

function HistoryPage() {
  const navigate = useNavigate();
  const [creds, setCreds] = useState<TerminalCreds | null>(null);
  useEffect(() => {
    const c = loadCreds();
    if (!c) { navigate({ to: "/pos/pair" }); return; }
    setCreds(c);
  }, [navigate]);

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#0a0d12] text-white">
      <div className="mx-auto w-full max-w-md px-5 py-6">
        <Link to="/pos" className="inline-flex items-center text-xs font-bold tracking-widest text-white/60 hover:text-white">
          <ChevronLeft className="size-4" /> BACK
        </Link>
        <h1 className="mt-2 text-xl font-bold">Recent sales</h1>
        <p className="mt-2 text-sm text-white/60">
          Open your NectarPay dashboard for the full invoice list. We&apos;re wiring this view up next.
        </p>
        {creds && (
          <p className="mt-6 text-[10px] font-mono text-white/40">
            terminal {creds.terminalId.slice(0, 8)}…
          </p>
        )}
      </div>
    </div>
  );
}
