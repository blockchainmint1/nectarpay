// POST /api/public/v1/terminals/invoice/:id/card-pay  (HMAC-signed by terminal)
//
// Relays a CryptoPOP tap-card payment using the dedicated shared NFC secret.
// Body: { card_uid, pin? }  → starts/continues a card payment
//       { payment_id }      → polls a pending (approval_required) payment
// HME selects the TXC/TSD option on the invoice itself (using a fresh tap
// nonce we mint here) and pays from the card's pocket.

import { createFileRoute } from "@tanstack/react-router";
import { CardRequest, cardInvoiceError, normalizeCardReply } from "@/lib/cryptopop-card";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Terminal-Id, X-Timestamp, X-Signature",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/v1/terminals/invoice/$id/card-pay")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request, params }) => {
        try {
          const rawBody = await request.text();
          if (rawBody.length > 4096) return json({ error: "Request too large." }, 413);
          const { verifyTerminalSignature } = await import("@/lib/terminals.server");
          const auth = await verifyTerminalSignature(request, rawBody);
          if (!auth.ok) return json({ error: auth.error }, auth.status);

          const parsed = CardRequest.safeParse(JSON.parse(rawBody || "{}"));
          if (!parsed.success) return json({ error: "Bad request." }, 400);

          const secret = process.env["NFC_PAY_SECRET"];
          if (!secret) return json({ error: "Card payments are not set up." }, 503);
          const { cardHeaders, CRYPTOPOP_CARD_URL, issueCardPollToken, validCardPollToken } = await import("@/lib/cryptopop-card.server");

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: inv } = await supabaseAdmin
            .from("invoices")
            .select("id, store_id, status, fiat_currency, expires_at")
            .eq("id", params.id)
            .maybeSingle();
          if (!inv) return json({ error: "Invoice not found." }, 404);
          if (inv.store_id !== auth.terminal.store_id) return json({ error: "Forbidden." }, 403);

          // Poll an existing payment.
          if ("payment_id" in parsed.data) {
            const pid = parsed.data.payment_id;
            if (!validCardPollToken(secret, parsed.data.poll_token, inv.id, auth.terminal.id, pid)) return json({ error: "Payment status request is not authorized for this sale." }, 403);
            const res = await fetch(`${CRYPTOPOP_CARD_URL}?id=${encodeURIComponent(pid)}`, {
              headers: cardHeaders(secret, pid), signal: AbortSignal.timeout(20000),
            });
            const r = await res.json().catch(() => ({}));
            return json({ ...normalizeCardReply(r, res.ok), payment_id: pid, poll_token: parsed.data.poll_token });
          }

          // TSD must be on for this store's TXC network.
          const { data: cfg } = await supabaseAdmin
            .from("chain_configs")
            .select("enabled, stables")
            .eq("store_id", inv.store_id)
            .eq("chain", "txc")
            .maybeSingle();
          const hasTsd = (cfg?.stables ?? []).map((t) => t.toUpperCase()).includes("TSD");
          const invalid = cardInvoiceError(inv, Boolean(cfg?.enabled && hasTsd));
          if (invalid) return json({ status: "failed", reason: invalid });

          const { issueTapHandoff } = await import("@/lib/tap-handoff.server");
          const tap = await issueTapHandoff(inv.id);

          const body = JSON.stringify({
            card_uid: parsed.data.card_uid,
            invoice_id: inv.id,
            nonce: tap.nonce,
            ...(parsed.data.pin ? { pin: parsed.data.pin } : {}),
          });
          const res = await fetch(CRYPTOPOP_CARD_URL, { method: "POST", headers: cardHeaders(secret, body), body, signal: AbortSignal.timeout(45000) });
          const r = normalizeCardReply(await res.json().catch(() => ({})), res.ok);
          if (!res.ok) console.error("[card-pay] CryptoPOP request failed", res.status);
          return json({ ...r, ...(r.payment_id ? { poll_token: issueCardPollToken(secret, inv.id, auth.terminal.id, r.payment_id) } : {}) });
        } catch (err) {
          console.error("[card-pay] request failed", err instanceof Error ? err.name : "unknown");
          return json({ status: "failed", reason: "Something went wrong. Try again." }, 500);
        }
      },
    },
  },
});
