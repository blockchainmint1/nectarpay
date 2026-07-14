import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Phone, Mail, MessageSquare } from "lucide-react";
import { LEAD_MARKETS, LEAD_INTERESTS, submitLead } from "@/lib/leads.functions";

const PHONE_DISPLAY = "855-6-NECTAR";
const PHONE_HREF = "tel:+18556632827"; // 855-663-2827

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is NectarPay?",
    a: "NectarPay is a payment platform that lets any merchant accept stablecoins and other crypto directly from customers — with no bank, no card processor, and no middleman touching your funds. You get the software, we ship you an optional POS terminal, and customers pay you peer-to-peer.",
  },
  {
    q: "How much does it cost?",
    a: "The software is free to start. Our POS terminal kit is $499 up front plus a $228 first-year service fee. See the /price and /fees pages for the full breakdown — there are no per-transaction card fees because there is no card network.",
  },
  {
    q: "Do you hold my money?",
    a: "No. NectarPay is non-custodial. Funds move directly from your customer's wallet to yours. We never touch, hold, or freeze your money — see /kyc for the full explanation.",
  },
  {
    q: "Do I need to KYC to use NectarPay?",
    a: "No — you don't KYC with us to become a merchant. We provide software and hardware. You can optionally enable KYC for your own customers from the dashboard, and we encourage you to comply with all applicable laws in your area.",
  },
  {
    q: "Which cryptocurrencies can I accept?",
    a: "Stablecoins (USDC, USDT and others) across multiple chains, plus Bitcoin, Ethereum, Solana, Tron, and TEXITcoin. Configure the exact list per store in your dashboard.",
  },
  {
    q: "How do I cash out to my bank?",
    a: "Since you're settling in stablecoins pegged to the dollar, you can off-ramp through any exchange or on/off-ramp provider that supports your region. See /cash-out for the current partners we recommend.",
  },
  {
    q: "How fast do payments settle?",
    a: "Confirmations depend on the chain, but most stablecoin transactions on L2s and fast chains settle in seconds. The terminal shows a confirmed state before you hand the customer their receipt.",
  },
  {
    q: "Do you have a merchant app?",
    a: "Yes — a mobile merchant view at /m for phone-only operators, and a full POS build for the terminal kit. Both connect to the same dashboard.",
  },
  {
    q: "How do I get a demo?",
    a: "Head to /demo — book a live walkthrough with our team, or watch the pre-recorded videos covering account setup, processing a transaction, velocity of money, and cashing out.",
  },
  {
    q: "I have a store on WooCommerce / PrestaShop / Shopify — does NectarPay work?",
    a: "Yes. We ship official plugins for WooCommerce and PrestaShop today, with more integrations rolling out. See /integrations for the current list and setup docs.",
  },
  {
    q: "Is there an API?",
    a: "Yes. Public REST endpoints for invoicing, payments, and terminal control. See /docs for the full reference and /integrate for a quickstart.",
  },
  {
    q: "How do I become an affiliate or sales rep?",
    a: "Sign up, then visit /affiliate in your dashboard for your referral link, or see the public /affiliates page for program details.",
  },
];

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Support · NectarPay" },
      {
        name: "description",
        content:
          "Get help with NectarPay. FAQs, contact form, and phone support at 855-6-NECTAR.",
      },
      { property: "og:title", content: "Help & Support · NectarPay" },
      {
        property: "og:description",
        content:
          "FAQs, contact form, and phone support for merchants using NectarPay.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { rel: "canonical", href: "https://nectar-pay.com/help" },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  const submit = useServerFn(submitLead);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    telegram: "",
    market: "Los Angeles",
    interest: "Support / question",
    message: "",
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await submit({
        data: {
          name: form.name,
          email: form.email,
          telegram: form.telegram,
          phone: form.phone,
          market: form.market,
          interest: form.interest,
          message: form.message,
          source: "help-page",
        },
      });
      setSent(true);
      toast.success("Thanks — we'll be in touch shortly.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Help & support
        </h1>
        <p className="mt-3 text-muted-foreground">
          Real humans, no phone tree. Grab the answer from the FAQ, ring us up, or
          send a note.
        </p>

        {/* Contact channels */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <a
            href={PHONE_HREF}
            className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-5 transition-colors hover:bg-card"
          >
            <Phone className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Call us
              </div>
              <div className="mt-1 font-semibold">{PHONE_DISPLAY}</div>
              <div className="text-xs text-muted-foreground">(855) 663-2827</div>
            </div>
          </a>
          <a
            href="mailto:hello@nectar-pay.com"
            className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-5 transition-colors hover:bg-card"
          >
            <Mail className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Email
              </div>
              <div className="mt-1 font-semibold">hello@nectar-pay.com</div>
              <div className="text-xs text-muted-foreground">~1 business day</div>
            </div>
          </a>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-5">
            <MessageSquare className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Book a demo
              </div>
              <div className="mt-1 font-semibold">
                <a href="/demo" className="underline underline-offset-4">
                  Schedule a walkthrough
                </a>
              </div>
              <div className="text-xs text-muted-foreground">Live, with a human</div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Can't find your answer? Send us a note below.
          </p>
          <Accordion type="single" collapsible className="mt-6 rounded-xl border border-border bg-card/60 px-6">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Contact form */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">Send us a note</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tell us what's going on — we'll route it to the right person.
          </p>

          {sent ? (
            <div className="mt-8 rounded-xl border border-border bg-card/60 p-8 text-center">
              <p className="text-lg font-semibold">Got it — talk soon.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                We typically respond within one business day. For urgent issues,
                call {PHONE_DISPLAY}.
              </p>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="mt-8 space-y-5 rounded-xl border border-border bg-card/60 p-6"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    maxLength={255}
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    maxLength={40}
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="telegram">Telegram (optional)</Label>
                  <Input
                    id="telegram"
                    maxLength={120}
                    placeholder="@yourhandle"
                    value={form.telegram}
                    onChange={(e) => update("telegram", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label>Market</Label>
                  <Select value={form.market} onValueChange={(v) => update("market", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_MARKETS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Topic</Label>
                  <Select value={form.interest} onValueChange={(v) => update("interest", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_INTERESTS.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="message">What's up?</Label>
                <Textarea
                  id="message"
                  required
                  rows={5}
                  maxLength={2000}
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  placeholder="Describe your question or issue. Include any relevant order or terminal IDs."
                />
              </div>

              <Button type="submit" disabled={sending} className="w-full sm:w-auto">
                {sending ? "Sending…" : "Send"}
              </Button>
            </form>
          )}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
