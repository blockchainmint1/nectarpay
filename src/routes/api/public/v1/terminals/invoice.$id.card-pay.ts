// POST /api/public/v1/terminals/invoice/:id/card-pay  (HMAC-signed by terminal)
//
// Relays an HME tap-card payment to HME Wallet (mobile.honest.money).
// Body: { card_uid, pin? }  → starts/continues a card payment
//       { payment_id }      → polls a pending (approval_required) payment
// HME selects the TXC/TSD option on the invoice itself (using a fresh tap
// nonce we mint here) and pays from the card's pocket.

import { createFileRoute } from "@tanstack/react-router";
import { createHmac } from "crypto";
import { z } from "zod";

const HME_BASE = "https://mobile.honest.money/api/public/card/pay";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Terminal-Id, X-Timestamp, X-Signature",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const Body = z.union([
  z.object({ payment_id: z.string().min(1).max(200) }),
  z.object({
    card_uid: z.string().min(4).max(64).regex(/^[0-9a-fA-F:\s-]+$/),
    pin: z.string().regex(/^\d{4,8}$/).optional(),
  }),
]);

function hmeHeaders(secret: string, signed: string) {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", secret).update(`${ts}.${signed}`).digest("hex");
  return { "content-type": "application/json", "x-hme-timestamp": ts, "x-hme-signature": sig };
}

type HmeReply = { status?: string; txid?: string; reason?: string; payment_id?: string; error?: string };

function normalize(r: HmeReply, httpOk: boolean) {
  const allowed = ["paid", "pin_required", "approval_required", "sending", "declined", "failed"];
  const status = r.status && allowed.includes(r.status) ? r.status : "failed";
  return {
    status,
    txid: r.txid ?? null,
    payment_id: r.payment_id ?? null,
    reason: r.reason ?? r.error ?? (httpOk ? null : "Card service is unavailable. Try again."),
  };
}

export const Route = createFileRoute("/api/public/v1/terminals/invoice/$id/card-pay")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request, params }) => {
        try {
          const rawBody = await request.text();
          const { verifyTerminalSignature } = await import("@/lib/terminals.server");
          const auth = await verifyTerminalSignature(request, rawBody);
          if (!auth.ok) return json({ error: auth.error }, auth.status);

          const parsed = Body.safeParse(JSON.parse(rawBody || "{}"));
          if (!parsed.success) return json({ error: "Bad request." }, 400);

          const secret = process.env["HME_ECOSYSTEM"];
          if (!secret) return json({ error: "Card payments are not set up." }, 503);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: inv } = await supabaseAdmin
            .from("invoices")
            .select("id, store_id, status, fiat_currency")
            .eq("id", params.id)
            .maybeSingle();
          if (!inv) return json({ error: "Invoice not found." }, 404);
          if (inv.store_id !== auth.terminal.store_id) return json({ error: "Forbidden." }, 403);

          // Poll an existing payment.
          if ("payment_id" in parsed.data) {
            const pid = parsed.data.payment_id;
            const res = await fetch(`${HME_BASE}?id=${encodeURIComponent(pid)}`, {
              headers: hmeHeaders(secret, pid),
            });
            const r = (await res.json().catch(() => ({}))) as HmeReply;
            return json({ ...normalize(r, res.ok), payment_id: pid });
          }

          if (inv.status !== "pending") return json({ status: "failed", reason: "This sale is no longer open." });
          if ((inv.fiat_currency ?? "USD").toUpperCase() !== "USD") {
            return json({ status: "failed", reason: "Card payments need a USD sale." });
          }

          // TSD must be on for this store's TXC network.
          const { data: cfg } = await supabaseAdmin
            .from("chain_configs")
            .select("*")
            .eq("store_id", inv.store_id)
            .eq("chain", "txc")
            .maybeSingle();
          const c = cfg as Record<string, unknown> | null;
          const tokens = (c?.["accepted_tokens"] ?? c?.["tokens"] ?? []) as unknown;
          const hasTsd = Array.isArray(tokens) && tokens.map((t) => String(t).toUpperCase()).includes("TSD");
          if (!c || c["enabled"] === false || !hasTsd) {
            return json({ status: "failed", reason: "This store doesn't accept TSD." });
          }

          const { issueTapHandoff } = await import("@/lib/tap-handoff.server");
          const tap = await issueTapHandoff(inv.id);

          const body = JSON.stringify({
            card_uid: parsed.data.card_uid,
            invoice_id: inv.id,
            nonce: tap.nonce,
            ...(parsed.data.pin ? { pin: parsed.data.pin } : {}),
          });
          const res = await fetch(HME_BASE, { method: "POST", headers: hmeHeaders(secret, body), body });
          const r = (await res.json().catch(() => ({}))) as HmeReply;
          if (!res.ok) console.error("[card-pay] HME replied", res.status, r);
          return json(normalize(r, res.ok));
        } catch (err) {
          console.error("[card-pay]", err);
          return json({ status: "failed", reason: "Something went wrong. Try again." }, 500);
        }
      },
    },
  },
});
