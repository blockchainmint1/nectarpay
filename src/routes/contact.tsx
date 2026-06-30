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
import { LEAD_MARKETS, LEAD_INTERESTS, submitLead } from "@/lib/leads.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Nectar.Pay · Become a merchant, sales rep, or open a market" },
      {
        name: "description",
        content:
          "Tell us about you. Become a Nectar.Pay merchant, join as a sales rep, or open a new market.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const submit = useServerFn(submitLead);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    telegram: "",
    market: "Los Angeles",
    interest: "Become a merchant",
    message: "",
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await submit({ data: { ...form, source: "contact-page" } });
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Get in touch</h1>
        <p className="mt-3 text-muted-foreground">
          Pick your market, tell us what you're after, and we'll route this to the right
          person on our team.
        </p>

        {sent ? (
          <div className="mt-10 rounded-xl border border-border bg-card/60 p-8 text-center">
            <p className="text-lg font-semibold">Got it — talk soon.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              We typically respond within one business day.
            </p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mt-10 space-y-5 rounded-xl border border-border bg-card/60 p-6"
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
                <Label>Interested in</Label>
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
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                rows={5}
                maxLength={2000}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder="Tell us a bit about your business or how you'd like to work together."
              />
            </div>

            <Button type="submit" disabled={sending} className="w-full sm:w-auto">
              {sending ? "Sending…" : "Send"}
            </Button>
          </form>
        )}
      </main>
      <MarketingFooter />
    </div>
  );
}
