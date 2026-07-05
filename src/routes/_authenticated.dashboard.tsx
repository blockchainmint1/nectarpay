import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Store, Plus, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/components/dashboard/transactions-table";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Nectar.Pay" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();

  const { data: stores, isLoading } = useQuery({
    queryKey: ["stores", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, website, fiat_currency, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("invoices")
        .select("fiat_amount, fiat_currency, status, created_at")
        .gte("created_at", since)
        .in("status", ["confirmed", "overpaid"]);
      if (error) throw error;
      const count = data?.length ?? 0;
      // Assume single fiat currency per merchant for the headline; sum across all paid.
      const volume = (data ?? []).reduce((acc, r) => acc + Number(r.fiat_amount ?? 0), 0);
      const currency = data?.[0]?.fiat_currency ?? stores?.[0]?.fiat_currency ?? "USD";
      return { count, volume, currency };
    },
    enabled: !!user,
  });

  const volumeText = stats
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: stats.currency }).format(stats.volume)
    : "$0.00";

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-10 md:px-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your gateway accounts and recent activity.
          </p>
        </div>
        <Button asChild>
          <Link to="/stores/new">
            <Plus className="mr-1 h-4 w-4" /> New store
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Stores" value={isLoading ? "…" : String(stores?.length ?? 0)} />
        <Stat label="Invoices (30d)" value={statsLoading ? "…" : String(stats?.count ?? 0)} />
        <Stat label="Volume (30d)" value={statsLoading ? "…" : volumeText} />
      </div>


      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Your stores</h2>
          <Link to="/stores" className="text-sm text-primary hover:underline">
            View all <ArrowRight className="inline h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-4 rounded-lg border border-border bg-card/50 p-6 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : stores && stores.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card/50">
            {stores.slice(0, 5).map((s) => (
              <li key={s.id}>
                <Link
                  to="/stores/$storeId"
                  params={{ storeId: s.id }}
                  className="flex items-center justify-between px-5 py-4 hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.website || "No website"} · {s.fiat_currency}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-card/30 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Store className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-medium">Create your first store</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A store is a set of credentials you give to a single ecommerce frontend.
            </p>
            <Button asChild className="mt-4">
              <Link to="/stores/new">Create store</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent transactions</h2>
        </div>
        <div className="mt-4">
          <TransactionsTable userId={user?.id} stores={stores ?? []} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-mono text-2xl tabular-nums">{value}</div>
    </div>
  );
}
