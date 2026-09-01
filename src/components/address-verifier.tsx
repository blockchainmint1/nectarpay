import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VerifyResult } from "@/lib/address-verify.server";

const KIND_LABEL: Record<string, string> = {
  derived_address: "Address we issued",
  invoice_address: "Invoice address",
  static_config: "Wallet config",
  xpub_scan: "Wallet key match",
  transaction: "Recorded transaction",
};

export function AddressVerifier({
  lookup,
  scope,
}: {
  lookup: (q: string) => Promise<VerifyResult>;
  scope: "admin" | "merchant";
}) {
  const [query, setQuery] = useState("");
  const mut = useMutation({ mutationFn: (q: string) => lookup(q) });
  const result = mut.data;

  return (
    <div className="space-y-6">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim().length >= 6) mut.mutate(query.trim());
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="0x… / bc1… / TZgY… / transaction hash / xpub…"
          className="font-mono text-xs"
        />
        <Button type="submit" disabled={mut.isPending || query.trim().length < 6}>
          <Search className="mr-2 h-4 w-4" />
          {mut.isPending ? "Checking…" : "Check it"}
        </Button>
      </form>

      {mut.isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {(mut.error as Error).message}
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="rounded-md border border-border/60 bg-card p-4">
            <div className="flex items-center gap-2 text-sm">
              {result.matches.length > 0 ? (
                <ShieldCheck className="h-4 w-4 text-primary" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
              <span className="font-medium">
                {result.matches.length > 0
                  ? scope === "merchant"
                    ? "Yours — this belongs to your account"
                    : `${result.matches.length} match${result.matches.length === 1 ? "" : "es"} found`
                  : scope === "merchant"
                    ? "Not yours — no match on your stores"
                    : "No match in NectarPay"}
              </span>
              <span className="ml-auto text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {result.queryType}
              </span>
            </div>
            <div className="mt-2 break-all font-mono text-xs text-muted-foreground">
              {result.query}
            </div>
          </div>

          {result.matches.map((m, i) => (
            <div key={i} className="rounded-md border border-border/60 bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-primary">
                  {KIND_LABEL[m.kind] ?? m.kind}
                </span>
                {m.chain && (
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] uppercase">
                    {m.chain}
                  </span>
                )}
                {m.derivation_path && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {m.derivation_path}
                  </span>
                )}
              </div>

              <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                <Row label="Store">
                  {m.store_id ? (
                    <Link
                      to="/stores/$storeId"
                      params={{ storeId: m.store_id }}
                      className="text-primary hover:underline"
                    >
                      {m.store_name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Row>
                {m.owner_email && <Row label="Owner">{m.owner_email}</Row>}
                {m.address && (
                  <Row label="Address" mono>
                    {m.address}
                  </Row>
                )}
                {m.tx_hash && (
                  <Row label="Tx hash" mono>
                    {m.tx_hash}
                  </Row>
                )}
                {m.invoice_id && (
                  <Row label="Invoice" mono>
                    {m.invoice_id.slice(0, 8)} · {m.invoice_status} · {m.invoice_amount}
                  </Row>
                )}
                {m.invoice_created_at && (
                  <Row label="Created">{new Date(m.invoice_created_at).toLocaleString()}</Row>
                )}
                {m.detail && <Row label="Detail">{m.detail}</Row>}
              </dl>
            </div>
          ))}

          {result.onchain && (
            <div className="rounded-md border border-border/60 bg-card p-4">
              <div className="text-sm font-medium">
                On-chain activity · {result.onchain.chain.toUpperCase()} (tip{" "}
                {result.onchain.tipHeight})
              </div>
              {result.onchain.credits.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No incoming payments seen at this address.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-xs">
                  {result.onchain.credits.map((c) => (
                    <li key={`${c.txid}-${c.amount}`} className="flex flex-wrap items-center gap-2">
                      <span className="font-mono">{c.amount}</span>
                      <span className="text-muted-foreground">{c.confirmations} conf</span>
                      <a
                        href={c.explorer}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                      >
                        {c.txid.slice(0, 16)}… <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {result.explorers.length > 0 && (
            <div className="flex flex-wrap gap-3 text-xs">
              {result.explorers.map((e) => (
                <a
                  key={e.url}
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  {e.label} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          )}

          {result.notes.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {result.notes.map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`break-all ${mono ? "font-mono text-xs" : "text-sm"}`}>{children}</dd>
    </div>
  );
}
