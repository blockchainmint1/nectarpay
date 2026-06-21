import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Store } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/stores/")({
  head: () => ({ meta: [{ title: "Stores · TEXITcoin Pay" }] }),
  component: StoresIndex,
});

function StoresIndex() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One store per ecommerce frontend you operate.
          </p>
        </div>
        <Button asChild>
          <Link to="/stores/new">
            <Plus className="mr-1 h-4 w-4" /> New store
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-8 text-sm text-muted-foreground">Loading…</div>
      ) : data && data.length > 0 ? (
        <ul className="mt-8 divide-y divide-border rounded-lg border border-border bg-card/50">
          {data.map((s) => (
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
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-border bg-card/30 p-10 text-center text-sm text-muted-foreground">
          No stores yet.{" "}
          <Link to="/stores/new" className="text-primary hover:underline">
            Create one
          </Link>
          .
        </div>
      )}
    </div>
  );
}
