import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { AddressVerifier } from "@/components/address-verifier";
import { verifyCryptoLookup } from "@/lib/address-verify.functions";

export const Route = createFileRoute("/_authenticated/admin/verify")({
  component: AdminVerify,
  head: () => ({
    meta: [
      { title: "Address Verifier · NectarPay Admin" },
      {
        name: "description",
        content:
          "Look up any crypto address or transaction hash and identify the merchant, store, and derivation index that owns it.",
      },
      { property: "og:title", content: "Address Verifier · NectarPay Admin" },
      {
        property: "og:description",
        content: "Trace any crypto address or transaction back to the merchant store that owns it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminVerify() {
  const lookup = useServerFn(verifyCryptoLookup);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Crypto address verifier</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste an address, transaction hash, or xpub. We match it against every merchant wallet key
          — including stale addresses from before a rotation — and tell you who owns it.
        </p>
      </div>
      <AddressVerifier lookup={(query) => lookup({ data: { query } })} scope="admin" />
    </div>
  );
}
