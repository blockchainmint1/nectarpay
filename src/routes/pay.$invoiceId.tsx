// Universal-link landing page for the NFC tap-to-pay handoff.
//
// On iOS, tapping the NDEF tag opens the OS banner with this https URL.
// If HME Mobile is installed, the universal-link/associated-domain config
// routes it directly to the wallet. Otherwise we land here and bounce the
// user to the regular checkout flow, preserving the tap nonce so the wallet
// can still claim it if they install + open it within the TTL.

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pay/$invoiceId")({
  // Server-side redirect — fast, no flash, no JS needed.
  beforeLoad: ({ params, location }) => {
    const t = new URLSearchParams(location.searchStr).get("t");
    const suffix = t ? `?t=${encodeURIComponent(t)}` : "";
    throw redirect({
      to: "/i/$invoiceId",
      params: { invoiceId: params.invoiceId },
      search: t ? { t } : undefined,
      // Fall back to plain string if router rejects extras
      replace: true,
    });
    // Unreachable — return for type happiness
    return suffix;
  },
});
