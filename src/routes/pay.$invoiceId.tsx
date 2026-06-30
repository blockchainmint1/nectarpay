// Universal-link landing page for the NFC tap-to-pay handoff.
//
// On iOS, tapping the NDEF tag opens the OS banner with this https URL.
// If HME Mobile is installed, the universal-link/associated-domain config
// routes it directly to the wallet. Otherwise we land here and forward
// the customer to the regular checkout flow.

import { createFileRoute, Navigate, useParams, useSearch } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/pay/$invoiceId")({
  validateSearch: z.object({ t: z.string().optional() }),
  component: PayLanding,
});

function PayLanding() {
  const { invoiceId } = useParams({ from: "/pay/$invoiceId" });
  useSearch({ from: "/pay/$invoiceId" }); // included for future use
  return <Navigate to="/i/$invoiceId" params={{ invoiceId }} replace />;
}
