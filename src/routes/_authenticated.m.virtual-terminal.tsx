// /m/virtual-terminal — merchant enters an amount and gets a QR + share
// link the customer can pay from any wallet. No card, no NFC, no printer.
// Reuses the existing invoice + on-chain watcher infra.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Share2, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { qrToDataURL } from "@/lib/qr";
import { Button } from "@/components/ui/button";
import {
  createVirtualInvoice,
  getVirtualInvoiceStatus,
  cancelVirtualInvoice,
} from "@/lib/merchant-invoice.functions";

export const Route = createFileRoute("/_authenticated/m/virtual-terminal")({
  head: () => ({
    meta: [
      { title: "Virtual Terminal · NectarPay" },
      { name: "viewport", content: "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" },
      { name: "theme-color", content: "#0D1B33" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VirtualTerminal,
});

function VirtualTerminal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const create = useServerFn(createVirtualInvoice);
  const status = useServerFn(getVirtualInvoiceStatus);
  const cancel = useServerFn(cancelVirtualInvoice);

  const { data: stores } = useQuery({
    queryKey: ["m", "stores", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, fiat_currency")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const [storeId, setStoreId] = useState<string | null>(null);
  useEffect(() => {
    if (!storeId && stores?.[0]) setStoreId(stores[0].id);
  }, [stores, storeId]);

  const store = stores?.find((s) => s.id === storeId);
  const currency = store?.fiat_currency ?? "USD";

  const [amount, setAmount] = useState<string>("0");
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState<{
    id: string;
    checkout_url: string;
    fiat_amount: number;
    currency: string;
    expires_at: string;
  } | null>(null);
  const [paid, setPaid] = useState(false);

  const amountValue = useMemo(() => Number(amount) / 100, [amount]);

  const press = (k: string) => {
    if (invoice) return;
    setAmount((prev) => {
      if (k === "back") return prev.length <= 1 ? "0" : prev.slice(0, -1);
      if (k === "clr") return "0";
      const next = (prev === "0" ? "" : prev) + k;
      // cap 9 digits => $9,999,999.99
      if (next.length > 9) return prev;
      return next;
    });
  };

  const submit = async () => {
    if (!storeId || amountValue <= 0 || busy) return;
    setBusy(true);
    try {
      const res = await create({ data: { store_id: storeId, amount: amountValue, currency } });
      const origin = window.location.origin;
      setInvoice({
        id: res.id,
        checkout_url: `${origin}${res.checkout_path}`,
        fiat_amount: res.fiat_amount,
        currency: res.currency,
        expires_at: res.expires_at,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create invoice");
    } finally {
      setBusy(false);
    }
  };

  // Poll status while the invoice is live.
  useEffect(() => {
    if (!invoice || paid) return;
    const t = setInterval(async () => {
      try {
        const s = await status({ data: { invoice_id: invoice.id } });
        if (s.status === "paid" || s.status === "confirmed") {
          setPaid(true);
          clearInterval(t);
        }
        if (s.status === "expired" || s.status === "cancelled") {
          clearInterval(t);
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [invoice, paid, status]);

  const closeInvoice = async () => {
    if (invoice && !paid) {
      try { await cancel({ data: { invoice_id: invoice.id } }); } catch { /* ignore */ }
    }
    setInvoice(null);
    setPaid(false);
    setAmount("0");
  };

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountValue);

  if (invoice) {
    return (
      <InvoiceScreen
        invoice={invoice}
        paid={paid}
        onClose={closeInvoice}
        onDone={() => navigate({ to: "/m/home" })}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link to="/m/home" aria-label="Back" className="rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="text-sm text-muted-foreground">Virtual Terminal</div>
        <div className="w-9" />
      </header>

      {(stores?.length ?? 0) > 1 && (
        <div className="border-b border-border px-4 py-2">
          <label className="text-xs text-muted-foreground">Store</label>
          <select
            value={storeId ?? ""}
            onChange={(e) => setStoreId(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {stores!.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Charge</div>
        <div className="mt-2 text-5xl font-semibold tabular-nums tracking-tight">
          {formatted}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-border">
        {["1","2","3","4","5","6","7","8","9",".","0","back"].map((k) => (
          <button
            key={k}
            onClick={() => press(k === "." ? "00" : k)}
            className="bg-background py-5 text-2xl font-medium tabular-nums hover:bg-accent active:bg-accent"
          >
            {k === "back" ? "⌫" : k === "." ? "00" : k}
          </button>
        ))}
      </div>

      <div className="border-t border-border bg-background p-4">
        <Button
          className="h-14 w-full text-base"
          disabled={amountValue <= 0 || !storeId || busy}
          onClick={submit}
        >
          {busy ? "Creating…" : `Charge ${formatted}`}
        </Button>
      </div>
    </div>
  );
}

function InvoiceScreen({
  invoice,
  paid,
  onClose,
  onDone,
}: {
  invoice: { id: string; checkout_url: string; fiat_amount: number; currency: string };
  paid: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    qrToDataURL(invoice.checkout_url, { margin: 1, width: 320 }).then(setQr).catch(() => setQr(null));
  }, [invoice.checkout_url]);

  const share = async () => {
    const msg = `Pay ${new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency }).format(invoice.fiat_amount)} — ${invoice.checkout_url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Payment request", text: msg, url: invoice.checkout_url });
        return;
      }
    } catch { /* user cancelled */ }
    try {
      await navigator.clipboard.writeText(invoice.checkout_url);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invoice.checkout_url);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  if (paid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 text-4xl">
          ✓
        </div>
        <h1 className="mt-6 text-2xl font-semibold">Paid</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency }).format(invoice.fiat_amount)}
        </p>
        <Button className="mt-8 w-full max-w-xs" onClick={onDone}>Done</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <button onClick={onClose} aria-label="Cancel" className="rounded-full p-2 hover:bg-accent">
          <X className="h-5 w-5" />
        </button>
        <div className="text-sm text-muted-foreground">Waiting for payment</div>
        <div className="w-9" />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <div className="text-3xl font-semibold tabular-nums">
          {new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency }).format(invoice.fiat_amount)}
        </div>
        <div className="rounded-2xl bg-white p-4">
          {qr ? (
            <img src={qr} alt="Payment QR" className="h-64 w-64" />
          ) : (
            <div className="h-64 w-64 animate-pulse rounded bg-muted" />
          )}
        </div>
        <p className="max-w-xs text-center text-sm text-muted-foreground">
          Ask your customer to scan with any crypto wallet, or send them the link.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
        <Button variant="outline" onClick={copy}>
          <Copy className="mr-2 h-4 w-4" /> Copy link
        </Button>
        <Button onClick={share}>
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
      </div>
    </div>
  );
}
