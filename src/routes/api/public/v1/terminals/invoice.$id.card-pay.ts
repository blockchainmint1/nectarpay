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

          const { cardHeaders, issueCardPollToken, validCardPollToken } = await import("@/lib/cryptopop-card.server");
          const { pickCardPartner } = await import("@/lib/card-partners");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Pick the wallet partner: the poll token names it, otherwise the card's web address does.
          const { data: partners } = await supabaseAdmin.from("card_partners")
            .select("id, name, pay_url, card_domains, secret, uses_legacy_secret, is_default, active");
          const pollPartnerId = "payment_id" in parsed.data ? parsed.data.poll_token.split("~")[0] : null;
          const partner = pollPartnerId
            ? (partners ?? []).find((p) => p.id === pollPartnerId && p.active) ?? null
            : pickCardPartner(partners ?? [], "card_url" in parsed.data ? parsed.data.card_url : null);
          if (!partner) return json({ status: "failed", reason: "This card's wallet isn't connected to NectarPay." });
          const secret = partner.secret || (partner.uses_legacy_secret ? process.env["NFC_PAY_SECRET"] : undefined);
          if (!secret) return json({ status: "failed", reason: `${partner.name} card payments are not set up yet.` }, 503);
          const PAY_URL = partner.pay_url;
          const { data: inv } = await supabaseAdmin
            .from("invoices")
            .select("id, store_id, status, fiat_currency, expires_at")
            .eq("id", params.id)
            .maybeSingle();
          if (!inv) return json({ error: "Invoice not found." }, 404);
          if (inv.store_id !== auth.terminal.store_id) return json({ error: "Forbidden." }, 403);

          // Diagnostic trail of every CryptoPOP exchange (never the card UID or PIN).
          const record = async (step: string, httpStatus: number | null, r: { status?: string; reason?: string | null; payment_id?: string | null; txid?: string | null }, started: number) => {
            const { error } = await supabaseAdmin.from("card_payment_events").insert({
              invoice_id: inv.id, store_id: inv.store_id, terminal_id: auth.terminal.id, step,
              partner_id: partner.id, http_status: httpStatus, status: r.status ?? null, reason: r.reason ? String(r.reason).slice(0, 500) : null,
              payment_id: r.payment_id ?? null, txid: r.txid ?? null, duration_ms: Date.now() - started,
            });
            if (error) console.error("[card-pay] event log failed", error.message);
          };

          // CryptoPOP's txid is a hint: check that exact tx on-chain right away
          // (same address/amount/settlement rules) instead of waiting for the watcher.
          const verifySent = async (r: { status?: string; txid?: string | null }) => {
            if (r.status !== "sent" || !r.txid) return;
            const { scanBtcLikeInvoiceNow } = await import("@/lib/watcher.functions");
            for (let i = 0; i < 3; i++) {
              const changed = await scanBtcLikeInvoiceNow(inv.id, r.txid).catch(() => false);
              if (changed) return;
              await new Promise((ok) => setTimeout(ok, 700));
            }
          };

          // Poll an existing payment.
          if ("payment_id" in parsed.data) {
            const pid = parsed.data.payment_id;
            const innerToken = parsed.data.poll_token.slice(partner.id.length + 1);
            if (!validCardPollToken(secret, innerToken, inv.id, auth.terminal.id, pid)) return json({ error: "Payment status request is not authorized for this sale." }, 403);
            const started = Date.now();
            try {
              const res = await fetch(`${PAY_URL}?id=${encodeURIComponent(pid)}`, {
                headers: cardHeaders(secret, pid), signal: AbortSignal.timeout(20000),
              });
              const r = normalizeCardReply(await res.json().catch(() => ({})), res.ok);
              await record("poll", res.status, { ...r, payment_id: pid }, started);
              await verifySent(r);
              return json({ ...r, payment_id: pid, poll_token: parsed.data.poll_token });
            } catch (e) {
              await record("poll", null, { status: "error", reason: e instanceof Error ? `${e.name}: ${e.message}` : "unknown", payment_id: pid }, started);
              throw e;
            }
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
          if (invalid) { await record("precheck", null, { status: "failed", reason: invalid }, Date.now()); return json({ status: "failed", reason: invalid }); }

          const { issueTapHandoff } = await import("@/lib/tap-handoff.server");
          const tap = await issueTapHandoff(inv.id);

          const body = JSON.stringify({
            card_uid: parsed.data.card_uid,
            invoice_id: inv.id,
            nonce: tap.nonce,
            ...(parsed.data.pin ? { pin: parsed.data.pin } : {}),
          });
          const step = parsed.data.pin ? "pay_with_pin" : "tap";
          const started = Date.now();
          let res: Response;
          try {
            res = await fetch(PAY_URL, { method: "POST", headers: cardHeaders(secret, body), body, signal: AbortSignal.timeout(45000) });
          } catch (e) {
            await record(step, null, { status: "error", reason: e instanceof Error ? `${e.name}: ${e.message}` : "unknown" }, started);
            const timedOut = e instanceof Error && e.name === "TimeoutError";
            return json({ status: "failed", reason: timedOut ? `${partner.name} didn't answer in time. Check the sale before retrying.` : `Couldn't reach ${partner.name}. Try again.` });
          }
          const r = normalizeCardReply(await res.json().catch(() => ({})), res.ok);
          await record(step, res.status, r, started);
          await verifySent(r);
          if (!res.ok) console.error("[card-pay] CryptoPOP request failed", res.status);
          return json({ ...r, ...(r.payment_id ? { poll_token: partner.id + "~" + issueCardPollToken(secret, inv.id, auth.terminal.id, r.payment_id) } : {}) });
        } catch (err) {
          console.error("[card-pay] request failed", err instanceof Error ? err.name : "unknown");
          return json({ status: "failed", reason: "Something went wrong. Try again." }, 500);
        }
      },
    },
  },
});
