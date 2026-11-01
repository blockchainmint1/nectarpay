import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { PartyPopper, Share2, Printer, Store } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";

const Search = z.object({
  code: z.string().regex(/^[0-9A-Za-z]{6}$/),
  name: z.string().max(120).optional(),
  amount: z.coerce.number().optional(),
});

export const Route = createFileRoute("/fast_/success")({
  validateSearch: (s) => Search.parse(s),
  head: () => ({
    meta: [
      { title: "You just got paid! — NectarPay Fast Start" },
      { name: "description", content: "Your first TSD payment arrived. Fast, easy, permanent." },
      { property: "og:title", content: "You just got paid! — NectarPay Fast Start" },
      { property: "og:description", content: "Your first TSD payment arrived. Fast, easy, permanent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FastSuccess,
});

function FastSuccess() {
  const { code, name, amount } = Route.useSearch();
  const url = `https://app.nectar-pay.com/s/${code}`;
  const share = async () => {
    const text = `${name ?? "We"} now take TSD — pay here: ${url}`;
    if (navigator.share) await navigator.share({ title: name, text, url }).catch(() => {});
    else await navigator.clipboard.writeText(text);
  };
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <PartyPopper className="mx-auto h-16 w-16 text-primary" />
        <h1 className="mt-4 text-5xl font-semibold">You just got paid!</h1>
        {amount != null && <p className="mt-3 text-2xl font-mono">${amount.toFixed(2)} in TSD{name ? ` · ${name}` : ""}</p>}
        <p className="mt-4 text-xl text-muted-foreground">Fast, easy, permanent. Now let's spread the word and get you more customers.</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <Button className="h-14" onClick={share}><Share2 className="mr-2 h-5 w-5" />Share my pay link</Button>
          <Button asChild variant="outline" className="h-14"><Link to="/directory"><Store className="mr-2 h-5 w-5" />See the directory</Link></Button>
          <Button variant="outline" className="h-14" onClick={() => window.print()}><Printer className="mr-2 h-5 w-5" />Print this page</Button>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">Put your stickers by the register and on the door. Check your welcome email to finish your account.</p>
        <Link to="/fast" className="mt-6 inline-block text-sm underline text-muted-foreground">Enroll another merchant</Link>
      </main>
      <MarketingFooter />
    </div>
  );
}
