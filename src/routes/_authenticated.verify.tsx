import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { AddressVerifier } from "@/components/address-verifier";
import { verifyMyAddress } from "@/lib/address-verify.functions";

export const Route = createFileRoute("/_authenticated/verify")({
  component: MerchantVerify,
  head: () => ({
    meta: [
      { title: "Is this a good transaction? · NectarPay" },
      {
        name: "description",
        content:
          "Check whether a crypto address or transaction belongs to your NectarPay stores before you release goods.",
      },
      { property: "og:title", content: "Is this a good transaction? · NectarPay" },
      {
        property: "og:description",
        content: "Verify a crypto address or transaction against your own NectarPay wallet keys.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MerchantVerify() {
  const lookup = useServerFn(verifyMyAddress);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Is this a good transaction?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A customer paid late, paid twice, or paid an old QR code? Paste the address or transaction
          hash here. We check it against every wallet key on your stores — including addresses that
          have already expired — and tell you whether the money landed in your wallet.
        </p>
      </div>
      <AddressVerifier lookup={(query) => lookup({ data: { query } })} scope="merchant" />
    </div>
  );
}
