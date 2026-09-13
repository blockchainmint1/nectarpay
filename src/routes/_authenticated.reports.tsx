import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Link2, Store } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { ALL_NETWORKS } from "@/lib/chains/networks";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  validateReportSearch,
  useReportSearch,
  useReportNavigate,
  type RangeKey,
} from "@/components/reports/report-context";

export const Route = createFileRoute("/_authenticated/reports")({
  validateSearch: validateReportSearch,
  head: () => ({
    meta: [
      { title: "Reports · Nectar-PAY" },
      {
        name: "description",
        content: "Sales, payment method, settlement and tax reports for your Nectar-PAY stores.",
      },
    ],
  }),
  component: ReportsLayout,
});

const TABS = [
  { to: "/reports", label: "Summary", exact: true },
  { to: "/reports/sales", label: "Sales over time" },
  { to: "/reports/methods", label: "Payment methods" },
  { to: "/reports/locations", label: "Stores & devices" },
  { to: "/reports/invoices", label: "Customers & invoices" },
  { to: "/reports/settlement", label: "Settlement & fees" },
  { to: "/reports/tax", label: "Tax & accounting" },
] as const;

const RANGES: Array<{ v: RangeKey; l: string }> = [
  { v: "today", l: "Today" },
  { v: "7d", l: "Last 7 days" },
  { v: "30d", l: "Last 30 days" },
  { v: "90d", l: "Last 90 days" },
  { v: "ytd", l: "Year to date" },
  { v: "custom", l: "Custom range" },
];

function ReportsLayout() {
  const search = useReportSearch();
  const setSearch = useReportNavigate();

  const { data: stores } = useQuery({
    queryKey: ["reports-stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-10 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything your books, your accountant, and your gut need to know.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card/50 p-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Date range</Label>
          <Select value={search.range} onValueChange={(v) => setSearch({ range: v as RangeKey })}>
            <SelectTrigger className="h-9 w-[180px]">
              <CalendarRange className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.v} value={r.v}>
                  {r.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {search.range === "custom" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                className="h-9 w-[160px]"
                value={search.from ?? ""}
                onChange={(e) => setSearch({ from: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                className="h-9 w-[160px]"
                value={search.to ?? ""}
                onChange={(e) => setSearch({ to: e.target.value })}
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Store</Label>
          <Select
            value={search.store ?? "all"}
            onValueChange={(v) => setSearch({ store: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="h-9 w-[200px]">
              <Store className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stores</SelectItem>
              {(stores ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Coin / chain</Label>
          <Select
            value={search.chain ?? "all"}
            onValueChange={(v) => setSearch({ chain: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <Link2 className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All chains</SelectItem>
              {Object.entries(ALL_NETWORKS).map(([k, net]) => (
                <SelectItem key={k} value={k}>
                  {net.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2 pb-1.5">
          <Switch
            id="compare"
            checked={search.compare}
            onCheckedChange={(c) => setSearch({ compare: c })}
          />
          <Label htmlFor="compare" className="text-xs text-muted-foreground">
            Compare to previous period
          </Label>
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-1 border-b border-border pb-px">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            search={(prev: Record<string, unknown>) => prev as never}
            activeOptions={{ exact: !!("exact" in t && t.exact) }}
            className="rounded-t-md border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            activeProps={{ className: "border-primary text-foreground" }}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
