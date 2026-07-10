// /m/home — merchant mobile home. Big tiles for the flows a merchant
// runs on their phone: virtual terminal, recent sales, payouts, stores.
//
// Web + native both land here after sign-in. Terminal-only surfaces
// (NFC, pair terminal, printer) are hidden — those live on /pos for
// the Senraise APK.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QrCode, Receipt, Wallet, Settings, Bell, Store } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useBiometricUnlock } from "@/lib/biometric";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/m/home")({
  head: () => ({
    meta: [
      { title: "NectarPay" },
      { name: "viewport", content: "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" },
      { name: "theme-color", content: "#0D1B33" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MerchantHome,
});

function MerchantHome() {
  const { user } = useAuth();
  const { state: unlockState, retry } = useBiometricUnlock();

  const { data: stores } = useQuery({
    queryKey: ["m", "stores", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && unlockState === "unlocked",
  });

  const { data: recent } = useQuery({
    queryKey: ["m", "recent", user?.id],
    queryFn: async () => {
      const storeIds = (stores ?? []).map((s) => s.id);
      if (storeIds.length === 0) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("id, fiat_amount, fiat_currency, status, created_at")
        .in("store_id", storeIds)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && unlockState === "unlocked" && (stores?.length ?? 0) > 0,
  });

  if (unlockState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Waiting for biometrics…</p>
      </div>
    );
  }

  if (unlockState === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-xs text-center">
          <h1 className="text-lg font-semibold">Locked</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            NectarPay is locked. Unlock with Face ID or your device passcode to continue.
          </p>
          <Button className="mt-6" onClick={retry}>Unlock</Button>
        </div>
      </div>
    );
  }

  const firstStore = stores?.[0];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">NectarPay</p>
            <h1 className="text-lg font-semibold tracking-tight">
              {firstStore?.name ?? "Your store"}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/notifications" aria-label="Notifications" className="rounded-full p-2 hover:bg-accent">
              <Bell className="h-5 w-5" />
            </Link>
            <Link to="/stores" aria-label="Stores" className="rounded-full p-2 hover:bg-accent">
              <Store className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-4 pt-6">
        <div className="grid grid-cols-2 gap-3">
          <Tile
            to={firstStore ? "/m/virtual-terminal" : "/stores/new"}
            icon={<QrCode className="h-6 w-6" />}
            title="Virtual Terminal"
            subtitle="Take a payment"
            primary
          />
          <Tile to="/dashboard" icon={<Receipt className="h-6 w-6" />} title="Sales" subtitle="Today & history" />
          <Tile to="/billing" icon={<Wallet className="h-6 w-6" />} title="Payouts" subtitle="Balance & plan" />
          <Tile
            to={firstStore ? "/stores/$storeId" : "/stores"}
            params={firstStore ? { storeId: firstStore.id } : undefined}
            icon={<Settings className="h-6 w-6" />}
            title="Store"
            subtitle="Settings"
          />
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Recent
            </h2>
            <Link to="/dashboard" className="text-xs text-primary hover:underline">
              See all
            </Link>
          </div>
          {(recent?.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No invoices yet. Tap Virtual Terminal to take your first payment.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card/50">
              {recent!.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: inv.fiat_currency }).format(inv.fiat_amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs " +
                      (inv.status === "confirmed" || inv.status === "detected"
                        ? "bg-emerald-500/15 text-emerald-500"
                        : inv.status === "pending"
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-muted text-muted-foreground")
                    }
                  >
                    {inv.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

type TileProps = {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  primary?: boolean;
  params?: Record<string, string>;
};

function Tile({ to, icon, title, subtitle, primary, params }: TileProps) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params={params as any}
      className={
        "flex flex-col justify-between rounded-2xl border p-4 min-h-32 transition-colors " +
        (primary
          ? "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15"
          : "border-border bg-card/60 hover:bg-card")
      }
    >
      <span className={primary ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      <div>
        <p className="text-base font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </Link>
  );
}
