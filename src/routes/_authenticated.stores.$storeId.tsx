import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, KeyRound, Link2, Receipt, Settings as SettingsIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/stores/$storeId")({
  head: () => ({ meta: [{ title: "Store · TEXITcoin Pay" }] }),
  component: StoreDetailPage,
});

function StoreDetailPage() {
  const { storeId } = Route.useParams();

  const { data: store, isLoading } = useQuery({
    queryKey: ["store", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, website, fiat_currency, webhook_url, created_at")
        .eq("id", storeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="px-8 py-10 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!store) {
    return (
      <div className="px-8 py-10">
        <p className="text-sm text-muted-foreground">Store not found.</p>
        <Button asChild variant="link" className="px-0">
          <Link to="/stores">Back to stores</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <Link
        to="/stores"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> All stores
      </Link>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{store.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {store.website || "No website set"} · {store.fiat_currency}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <CardLink
          icon={<Link2 className="h-4 w-4" />}
          title="Chains"
          body="Configure xpubs and addresses per chain."
          to={`/stores/${storeId}/chains`}
        />
        <CardLink
          icon={<KeyRound className="h-4 w-4" />}
          title="API keys"
          body="Issue, rotate, and revoke API credentials."
          to={`/stores/${storeId}/keys`}
        />
        <CardLink
          icon={<Receipt className="h-4 w-4" />}
          title="Invoices"
          body="Browse incoming payments and statuses."
          to={`/stores/${storeId}/invoices`}
          comingSoon
        />
        <CardLink
          icon={<SettingsIcon className="h-4 w-4" />}
          title="Settings"
          body="Webhook URL, fiat currency, expiry rules."
          to={`/stores/${storeId}/settings`}
          comingSoon
        />
      </div>
    </div>
  );
}

function CardLink({
  icon,
  title,
  body,
  to,
  comingSoon,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  to: string;
  comingSoon?: boolean;
}) {
  const inner = (
    <div className="rounded-lg border border-border bg-card/60 p-5 transition-colors hover:bg-accent">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="font-medium">{title}</div>
        {comingSoon && (
          <span className="ml-auto rounded-full border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            soon
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
  if (comingSoon) return <div className="cursor-not-allowed opacity-60">{inner}</div>;
  return <Link to={to}>{inner}</Link>;
}
