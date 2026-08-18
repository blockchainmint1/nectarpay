import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  Copy,
  Eye,
  Mail,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";

import {
  cancelStoreInvoice,
  createStoreInvoice,
  listStoreInvoices,
  resendStoreInvoice,
} from "@/lib/store-invoices.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/stores/$storeId/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices · Nectar.Pay" },
      {
        name: "description",
        content:
          "Create and email crypto payment requests, track opens, resend reminders, and review completed invoice transactions.",
      },
    ],
  }),
  component: StoreInvoicesPage,
});

const OPEN_STATUSES = ["pending", "detected", "underpaid"];
const DONE_STATUSES = ["confirmed", "overpaid"];

type Invoice = Awaited<ReturnType<typeof listStoreInvoices>>[number];

function StoreInvoicesPage() {
  const { storeId } = Route.useParams();
  const qc = useQueryClient();

  const list = useServerFn(listStoreInvoices);
  const create = useServerFn(createStoreInvoice);
  const resend = useServerFn(resendStoreInvoice);
  const cancel = useServerFn(cancelStoreInvoice);

  const { data, isLoading, error } = useQuery({
    queryKey: ["store-invoices", storeId],
    queryFn: () => list({ data: { store_id: storeId } }),
    refetchInterval: 20_000,
  });

  const [tab, setTab] = useState<"open" | "completed" | "all">("open");
  const [showForm, setShowForm] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["store-invoices", storeId] });

  const createMut = useMutation({
    mutationFn: create,
    onSuccess: (res) => {
      setShowForm(false);
      invalidate();
      if (res.emailed) toast.success("Invoice created and emailed.");
      else if (res.emailError) toast.warning(`Invoice created, email failed: ${res.emailError}`);
      else toast.success("Invoice created — copy the link to share it.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resendMut = useMutation({
    mutationFn: resend,
    onSuccess: (r) => {
      invalidate();
      toast.success(`Reminder sent to ${r.to}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: cancel,
    onSuccess: () => {
      invalidate();
      toast.success("Invoice cancelled.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const all = (data ?? []) as Invoice[];
    if (tab === "open") return all.filter((i) => OPEN_STATUSES.includes(i.status));
    if (tab === "completed") return all.filter((i) => DONE_STATUSES.includes(i.status));
    return all;
  }, [data, tab]);

  const stats = useMemo(() => {
    const all = (data ?? []) as Invoice[];
    const open = all.filter((i) => OPEN_STATUSES.includes(i.status));
    const paid = all.filter((i) => DONE_STATUSES.includes(i.status));
    const sum = (xs: Invoice[]) => xs.reduce((t, i) => t + Number(i.fiat_amount ?? 0), 0);
    return {
      outstanding: sum(open),
      outstandingCount: open.length,
      paid: sum(paid),
      paidCount: paid.length,
      currency: all[0]?.fiat_currency ?? "USD",
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <Link
        to="/stores/$storeId"
        params={{ storeId }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Store
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Email a payment request, track when it&apos;s opened, and see completed transactions.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="h-11">
          <Plus className="mr-1 h-4 w-4" /> New invoice
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Outstanding" value={money(stats.outstanding, stats.currency)} sub={`${stats.outstandingCount} open`} />
        <Stat label="Collected" value={money(stats.paid, stats.currency)} sub={`${stats.paidCount} paid`} />
        <Stat label="Total issued" value={String((data ?? []).length)} sub="all time" />
      </div>

      {showForm && (
        <NewInvoiceForm
          storeId={storeId}
          pending={createMut.isPending}
          onSubmit={(payload) => createMut.mutate({ data: payload })}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="mt-8 flex gap-2">
        {(["open", "completed", "all"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-9 rounded-md border px-3 text-sm capitalize ${
              tab === t
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="mt-6 text-sm text-destructive">{(error as Error).message}</p>}

      {!isLoading && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Delivery</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => {
                const email = inv.buyer_email ?? inv.customer_email;
                const closed = ["confirmed", "overpaid", "cancelled"].includes(inv.status);
                return (
                  <tr key={inv.id} className="border-t border-border/40 align-top">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {email ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3">
                      {inv.description ?? "—"}
                      {inv.external_order_id && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          #{inv.external_order_id}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {money(Number(inv.fiat_amount), inv.fiat_currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {inv.email_sent_at
                          ? `sent ${new Date(inv.email_sent_at).toLocaleDateString()}${
                              (inv.email_send_count ?? 0) > 1 ? ` ×${inv.email_send_count}` : ""
                            }`
                          : "not emailed"}
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {inv.first_viewed_at
                          ? `opened ${new Date(inv.first_viewed_at).toLocaleDateString()}`
                          : "not opened"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <IconBtn
                          title="Copy payment link"
                          onClick={() => {
                            void navigator.clipboard.writeText(
                              `${window.location.origin}/i/${inv.id}`,
                            );
                            toast.success("Payment link copied.");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </IconBtn>
                        {!closed && (
                          <IconBtn
                            title={email ? "Resend email" : "No email on file"}
                            disabled={!email || resendMut.isPending}
                            onClick={() => resendMut.mutate({ data: { invoice_id: inv.id } })}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </IconBtn>
                        )}
                        {!closed && (
                          <IconBtn
                            title="Cancel invoice"
                            disabled={cancelMut.isPending}
                            onClick={() => {
                              if (confirm("Cancel this invoice?"))
                                cancelMut.mutate({ data: { invoice_id: inv.id } });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </IconBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No invoices here yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewInvoiceForm({
  storeId,
  pending,
  onSubmit,
  onCancel,
}: {
  storeId: string;
  pending: boolean;
  onSubmit: (payload: {
    store_id: string;
    amount: number;
    description?: string;
    memo?: string;
    buyer_email?: string;
    external_order_id?: string;
    expires_days?: number;
    send_email?: boolean;
  }) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [memo, setMemo] = useState("");
  const [orderId, setOrderId] = useState("");
  const [days, setDays] = useState("7");
  const [sendEmail, setSendEmail] = useState(true);

  const input =
    "h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40";

  return (
    <form
      className="mt-6 rounded-lg border border-border bg-card/60 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) {
          toast.error("Enter a valid amount.");
          return;
        }
        if (sendEmail && !email.trim()) {
          toast.error("Add a customer email or turn off sending.");
          return;
        }
        onSubmit({
          store_id: storeId,
          amount: amt,
          description: description.trim() || undefined,
          memo: memo.trim() || undefined,
          buyer_email: email.trim() || undefined,
          external_order_id: orderId.trim() || undefined,
          expires_days: Number(days) || 7,
          send_email: sendEmail,
        });
      }}
    >
      <h2 className="text-lg font-medium">New payment request</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Amount</span>
          <input
            className={input}
            inputMode="decimal"
            placeholder="150.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Customer email</span>
          <input
            className={input}
            type="email"
            placeholder="customer@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Description</span>
          <input
            className={input}
            placeholder="Deposit — kitchen remodel"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Your order / ref #</span>
          <input
            className={input}
            placeholder="INV-1042"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-muted-foreground">Note to customer (optional)</span>
          <textarea
            className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Expires in (days)</span>
          <input
            className={input}
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
          />
          Email the payment request now
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={pending} className="h-11">
          {pending ? "Creating…" : "Create invoice"}
        </Button>
        <Button type="button" variant="ghost" className="h-11" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        The customer picks their network (bitcoin, stablecoins, TSD on TEXITcoin…) on the hosted
        checkout page. Funds settle straight to your wallet — Nectar.Pay never holds them.
      </p>
    </form>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "confirmed" || status === "overpaid"
      ? "border-emerald-500/40 text-emerald-500"
      : status === "cancelled" || status === "expired" || status === "failed"
        ? "border-border text-muted-foreground"
        : "border-primary/40 text-primary";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${tone}`}>{status}</span>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
