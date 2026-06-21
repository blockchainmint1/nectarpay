import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileSpreadsheet, FileJson, Receipt, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { runExport, type ExportFormat } from "@/lib/exports.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exports")({
  head: () => ({ meta: [{ title: "Exports · payHME" }] }),
  component: ExportsPage,
});

const FORMATS: Array<{
  id: ExportFormat;
  title: string;
  desc: string;
  icon: typeof FileSpreadsheet;
}> = [
  { id: "invoices_csv", title: "Invoices CSV", desc: "All invoices with status, amounts, store, and timestamps.", icon: FileSpreadsheet },
  { id: "transactions_csv", title: "Transactions CSV", desc: "On-chain transactions: tx hash, amount, confirmations, block.", icon: Receipt },
  { id: "quickbooks_csv", title: "QuickBooks Sales Receipts", desc: "Paid invoices pre-formatted for QuickBooks Online Sales Receipt CSV import.", icon: FileSpreadsheet },
  { id: "json", title: "JSON archive", desc: "Full structured export of invoices + nested transactions.", icon: FileJson },
];

const STATUSES = ["pending", "confirmed", "expired", "cancelled", "failed", "overpaid"];
const CHAINS = [
  { v: "btc", l: "Bitcoin" },
  { v: "txc", l: "TEXITcoin" },
  { v: "eth", l: "Ethereum" },
  { v: "base", l: "Base" },
  { v: "tron", l: "Tron" },
  { v: "sol", l: "Solana" },
];

function ExportsPage() {
  const [storeId, setStoreId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [chain, setChain] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const { data: stores } = useQuery({
    queryKey: ["stores-for-export"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const runExportFn = useServerFn(runExport);
  const mutation = useMutation({
    mutationFn: (format: ExportFormat) =>
      runExportFn({
        data: {
          format,
          storeId: storeId === "all" ? null : storeId,
          status: status === "all" ? null : status,
          chain: chain === "all" ? null : chain,
          fromDate: fromDate ? new Date(fromDate).toISOString() : null,
          toDate: toDate ? new Date(`${toDate}T23:59:59.999Z`).toISOString() : null,
        },
      }),
    onSuccess: (res) => {
      const blob = new Blob([res.content], { type: res.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${res.filename}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Export failed"),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exports & accounting</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download your invoices and transactions, or push paid receipts straight into QuickBooks.
        </p>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Applied to every export below.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Store</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stores</SelectItem>
                {stores?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Chain</Label>
            <Select value={chain} onValueChange={setChain}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All chains</SelectItem>
                {CHAINS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {FORMATS.map((f) => {
          const Icon = f.icon;
          const isLoading = mutation.isPending && mutation.variables === f.id;
          return (
            <Card key={f.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
                  <div>
                    <CardTitle className="text-base">{f.title}</CardTitle>
                    <CardDescription className="mt-1">{f.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button onClick={() => mutation.mutate(f.id)} disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Download
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Importing into QuickBooks Online</CardTitle>
          <CardDescription>
            The QuickBooks Sales Receipts CSV matches QBO's native Sales Receipt import schema.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. In QuickBooks Online, go to <strong>Settings → Import data → Sales Receipts</strong>.</p>
          <p>2. Upload the CSV. QBO will auto-map most columns; confirm <em>Customer</em>, <em>Date</em>, and <em>Amount</em>.</p>
          <p>3. If prompted, create the <code className="rounded bg-muted px-1">Crypto Payment</code> product/service first (type: Service, income account of your choice).</p>
          <p>4. Review and import. Each paid payHME invoice becomes one Sales Receipt.</p>
        </CardContent>
      </Card>
    </div>
  );
}
