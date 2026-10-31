import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Store, ShieldCheck } from "lucide-react";
import { getStickerMerchant, startStickerPayment } from "@/lib/sticker.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketingFooter } from "@/components/marketing-shell";

const merchantQuery = (code: string) => queryOptions({ queryKey: ["sticker", code], queryFn: () => getStickerMerchant({ data: { code } }) });
export const Route = createFileRoute("/s/$code")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(merchantQuery(params.code)),
  head: ({ params }) => ({ meta: [
    { title: `Merchant ${params.code} · NectarPay sticker payment` },
    { name: "description", content: "Pay a verified NectarPay merchant in TSD using their Cold Storage Coin sticker." },
    { property: "og:title", content: `Merchant ${params.code} · NectarPay` },
    { property: "og:description", content: "A direct TSD payment to the merchant’s Cold Storage Coin." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: StickerPage,
});

function StickerPage() {
  const { code } = Route.useParams();
  const { data: merchant } = useSuspenseQuery(merchantQuery(code));
  const pay = useServerFn(startStickerPayment);
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  async function start(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const result = await pay({ data: { code, amount: Number(amount) } }); await navigate({ to: "/i/$invoiceId", params: { invoiceId: result.id } }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not start payment."); }
    finally { setBusy(false); }
  }
  return <div className="min-h-dvh bg-background flex flex-col">
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-14">
      <Store className="mb-6 h-10 w-10 text-primary" />
      <p className="font-mono text-sm text-muted-foreground">Merchant {code}</p>
      <h1 className="mt-2 text-3xl font-semibold">{merchant?.name ?? "Merchant not activated"}</h1>
      {merchant ? <form className="mt-10 space-y-5" onSubmit={start}>
        <label className="block space-y-2"><span>Purchase total (USD)</span><Input aria-label="Purchase total (USD)" type="number" inputMode="decimal" min="0.50" max="250" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="h-14 text-2xl" /></label>
        <p className="text-sm text-muted-foreground">TSD on TEXITcoin · $0.50–$250 per payment</p>
        {merchant.giving && <p className="text-sm text-primary">Give Back accepted · 10% community share</p>}
        <Button className="h-14 w-full" disabled={busy || Number(amount) < 0.5 || Number(amount) > 250}>{busy ? "Starting payment…" : "Continue to payment"}</Button>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Paid directly to the merchant’s coin</p>
      </form> : <p className="mt-6 text-muted-foreground">This sticker is not accepting payments yet.</p>}
    </main><MarketingFooter />
  </div>;
}