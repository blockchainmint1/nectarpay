import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2, ShieldCheck, Truck } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createKitCheckout } from "@/lib/kit-checkout.functions";

const KIT_PRICE = 499;
const FIRST_YEAR_PRICE = 228;

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout · Nectar.Pay Terminal Kit" },
      {
        name: "description",
        content:
          "Order the NectarPay Terminal Kit and optional first-year service. Pay in crypto — Blockchain Mint ships worldwide.",
      },
      { property: "og:title", content: "Checkout · Nectar.Pay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const create = useServerFn(createKitCheckout);

  const [includeFirstYear, setIncludeFirstYear] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    ship_line1: "",
    ship_line2: "",
    ship_city: "",
    ship_region: "",
    ship_postal: "",
    ship_country: "United States",
  });

  const subtotal = includeFirstYear ? KIT_PRICE + FIRST_YEAR_PRICE : KIT_PRICE;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await create({
        data: { ...form, include_first_year: includeFirstYear },
      });
      // Hand off to hosted crypto checkout; thanks page reads ?order= on return.
      const returnUrl = encodeURIComponent(`/checkout/thanks?order=${res.order_id}`);
      window.location.href = `${res.pay_url}?return=${returnUrl}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  function setField<K extends keyof typeof form>(key: K, v: string) {
    setForm((f) => ({ ...f, [key]: v }));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />

      <main className="mx-auto max-w-5xl px-4 pt-24 pb-16">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-widest text-primary">Checkout</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            NectarPay Terminal Kit
          </h1>
          <p className="mt-2 text-foreground/70">
            Pay in crypto. Blockchain Mint ships worldwide — usually inside a week.
          </p>
        </header>

        <form onSubmit={onSubmit} className="grid gap-10 md:grid-cols-[1fr_360px]">
          {/* LEFT: form */}
          <div className="space-y-8">
            <section className="rounded-2xl border border-border/50 bg-card/50 p-6">
              <h2 className="text-sm font-medium uppercase tracking-widest text-foreground/60">
                Contact
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Email" required>
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </Field>
                <Field label="Full name" required>
                  <Input
                    required
                    autoComplete="name"
                    value={form.full_name}
                    onChange={(e) => setField("full_name", e.target.value)}
                  />
                </Field>
                <Field label="Phone (optional)">
                  <Input
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-border/50 bg-card/50 p-6">
              <h2 className="text-sm font-medium uppercase tracking-widest text-foreground/60">
                Shipping address
              </h2>
              <div className="mt-4 grid gap-4">
                <Field label="Street address" required>
                  <Input
                    required
                    autoComplete="address-line1"
                    value={form.ship_line1}
                    onChange={(e) => setField("ship_line1", e.target.value)}
                  />
                </Field>
                <Field label="Apt / suite (optional)">
                  <Input
                    autoComplete="address-line2"
                    value={form.ship_line2}
                    onChange={(e) => setField("ship_line2", e.target.value)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="City" required>
                    <Input
                      required
                      autoComplete="address-level2"
                      value={form.ship_city}
                      onChange={(e) => setField("ship_city", e.target.value)}
                    />
                  </Field>
                  <Field label="State / region">
                    <Input
                      autoComplete="address-level1"
                      value={form.ship_region}
                      onChange={(e) => setField("ship_region", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Postal code" required>
                    <Input
                      required
                      autoComplete="postal-code"
                      value={form.ship_postal}
                      onChange={(e) => setField("ship_postal", e.target.value)}
                    />
                  </Field>
                  <Field label="Country" required>
                    <Input
                      required
                      autoComplete="country-name"
                      value={form.ship_country}
                      onChange={(e) => setField("ship_country", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT: order summary */}
          <aside className="space-y-6 md:sticky md:top-24 md:self-start">
            <div className="rounded-2xl border border-border/50 bg-card/60 p-6">
              <h2 className="text-sm font-medium uppercase tracking-widest text-foreground/60">
                Your order
              </h2>

              <div className="mt-4 space-y-4">
                <LineItem
                  title="NectarPay Terminal Kit"
                  sub="Terminal + BeeKeeper coin + thermal printer"
                  price={KIT_PRICE}
                  locked
                />

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/40 bg-background/40 p-3 hover:border-primary/40">
                  <Checkbox
                    checked={includeFirstYear}
                    onCheckedChange={(v) => setIncludeFirstYear(!!v)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">First-Year Service</span>
                      <span className="font-mono text-primary">${FIRST_YEAR_PRICE}</span>
                    </div>
                    <p className="mt-1 text-xs text-foreground/60">
                      12 months of Nectar.Pay Pro — unlimited invoices, all chains,
                      no monthly billing hassle. Cancel anytime.
                    </p>
                  </div>
                </label>
              </div>

              <div className="mt-5 border-t border-border/40 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-foreground/70">Subtotal</span>
                  <span className="font-mono">${subtotal.toFixed(2)}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-xs text-foreground/50">
                  <span>Shipping</span>
                  <span>Included</span>
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-border/40 pt-3">
                  <span className="text-sm uppercase tracking-widest text-foreground/70">
                    Total
                  </span>
                  <span className="font-mono text-2xl text-primary">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {error && (
                <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating invoice…
                  </>
                ) : (
                  <>
                    Pay with crypto <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="mt-3 text-[11px] leading-snug text-foreground/50">
                You&rsquo;ll be handed to our secure crypto checkout — BTC, TXC, or
                USDC. As soon as it confirms, Blockchain Mint packs and ships.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-foreground/60">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Non-custodial — we never hold your funds
              </li>
              <li className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Ships from Blockchain Mint · worldwide
              </li>
            </ul>

            <p className="text-[11px] text-foreground/40">
              Questions?{" "}
              <Link to="/integrate" className="underline hover:text-foreground/70">
                See docs
              </Link>{" "}
              or email support@nectar-pay.com.
            </p>
          </aside>
        </form>
      </main>

      <MarketingFooter />
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-widest text-foreground/60">
        {label} {required && <span className="text-primary">*</span>}
      </Label>
      {children}
    </div>
  );
}

function LineItem({
  title,
  sub,
  price,
  locked,
}: {
  title: string;
  sub: string;
  price: number;
  locked?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="mt-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
      <div className="flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium">{title}</span>
          <span className="font-mono text-primary">${price}</span>
        </div>
        <p className="mt-1 text-xs text-foreground/60">{sub}</p>
        {locked && (
          <p className="mt-1 text-[10px] uppercase tracking-widest text-foreground/40">
            Included
          </p>
        )}
      </div>
    </div>
  );
}
