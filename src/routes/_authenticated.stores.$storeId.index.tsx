import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, KeyRound, Link2, Receipt, Share2, ShieldCheck, Smartphone, Sliders, Wallet,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useStoreRef } from "@/lib/store-ref";
import { StoreInfoForm } from "@/components/store/StoreInfoForm";
import { StoreWalletBalance } from "@/components/store/StoreWalletBalance";

export const Route = createFileRoute("/_authenticated/stores/$storeId/")({
  head: () => ({
    meta: [
      { title: "Store · Nectar.Pay" },
      { name: "description", content: "Manage your store's info, payments, wallets and settings." },
      { property: "og:title", content: "Store · Nectar.Pay" },
      { property: "og:description", content: "Manage your store's info, payments, wallets and settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StoreDetailPage,
});

type Sub = "chains" | "balances" | "keys" | "terminals" | "share-links" | "pos-settings" | "invoices" | "kyc";

function StoreDetailPage() {
  const { storeId, storeSlug } = useStoreRef();

  const { data: store } = useQuery({
    queryKey: ["store", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, website, fiat_currency, business_logo_url")
        .eq("id", storeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const tile = (icon: React.ReactNode, title: string, body: string, sub: Sub) => (
    <Tile icon={icon} title={title} body={body} slug={storeSlug} sub={sub} />
  );

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-10 md:px-8">
      <Link to="/stores" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> All stores
      </Link>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {store?.business_logo_url ? (
            <img src={store.business_logo_url} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-border bg-card object-contain p-1" />
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight">{store?.name ?? "…"}</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              /stores/{storeSlug} · {store?.website || "No website set"} · {store?.fiat_currency}
            </p>
          </div>
        </div>
        <StoreWalletBalance storeId={storeId} storeSlug={storeSlug} />
      </div>

      <Section title="Your Store Info" hint="What customers see on the map, receipts and your listing.">
        <StoreInfoForm storeId={storeId} storeSlug={storeSlug} />
      </Section>

      <Section title="Get Paid">
        <div className="grid gap-4 md:grid-cols-2">
          {tile(<Share2 className="h-4 w-4" />, "Share payment links", "A permanent link that opens a checkout in any browser — great for email signatures, donation buttons and social posts.", "share-links")}
          {tile(<Receipt className="h-4 w-4" />, "Send an invoice", "Email a payment request, track opens, resend reminders and review completed sales.", "invoices")}
        </div>
      </Section>

      <Section title="Tech Stuff">
        <div className="grid gap-4 md:grid-cols-2">
          {tile(<KeyRound className="h-4 w-4" />, "API keys", "Issue, rotate and revoke keys for your website or plugins.", "keys")}
          {tile(<Link2 className="h-4 w-4" />, "Wallets & Chains", "Link your wallet and choose which coins this store accepts.", "chains")}
        </div>
      </Section>

      <Section title="Other Settings">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tile(<Wallet className="h-4 w-4" />, "Balances", "Live balances, address by address.", "balances")}
          {tile(<Smartphone className="h-4 w-4" />, "Terminals", "Pair and manage POS devices.", "terminals")}
          {tile(<Sliders className="h-4 w-4" />, "POS terminal experience", "Tips, signatures, receipts and receipt header.", "pos-settings")}
          {tile(<ShieldCheck className="h-4 w-4" />, "Buyer verification (KYC)", "Optional sanctions, wallet risk and geo checks.", "kyc")}
        </div>
      </Section>

      <div className="mt-12 rounded-lg border border-destructive/40 bg-destructive/5 p-5">
        <div className="font-medium text-destructive">Close this store</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Switches off terminals, API keys, share links and payment rails for this store. Past invoices and transactions are kept in your records.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to="/account">Go to account settings</Link>
        </Button>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline gap-3 border-b border-border pb-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {hint && <p className="hidden text-sm text-muted-foreground sm:block">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Tile({ icon, title, body, slug, sub }: { icon: React.ReactNode; title: string; body: string; slug: string; sub: Sub }) {
  return (
    <Link
      to={`/stores/$storeId/${sub}` as "/stores/$storeId/chains"}
      params={{ storeId: slug }}
      className="block h-full rounded-lg border border-border bg-card/60 p-5 transition-colors hover:border-primary/40 hover:bg-accent"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
        <div className="font-medium">{title}</div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </Link>
  );
}
