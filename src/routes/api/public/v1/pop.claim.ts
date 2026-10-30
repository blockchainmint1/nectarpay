// POST /api/public/v1/pop/claim — a wallet partner asks how many POP its shopper earned
// for a NectarPay sale it paid. Signed with the partner's shared key:
//   X-HME-Partner: <partner id> (optional; default partner otherwise)
//   X-HME-Timestamp: unix seconds   X-HME-Signature: hex HMAC-SHA256(key, ts + "." + raw body)
// Body: { txid, shopper_ref, payer_addresses?: string[], shopper_email_sha256?: string }
// Idempotent: one decision per sale; repeat claims return it (held awards are re-checked).

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  txid: z.string().regex(/^(0x)?[0-9a-fA-F]{64}$/),
  shopper_ref: z.string().min(1).max(128),
  payer_addresses: z.array(z.string().min(20).max(128)).max(50).optional().default([]),
  shopper_email_sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/public/v1/pop/claim")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > 8192) return json({ error: "Request too large." }, 413);
        const { createHmac, createHash, timingSafeEqual } = await import("crypto");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Verify the partner signature.
        const { data: partners } = await supabaseAdmin.from("card_partners").select("id, name, secret, uses_legacy_secret, is_default, active");
        const pid = request.headers.get("x-hme-partner");
        const partner = (partners ?? []).find((p) => p.active && (pid ? p.id === pid : p.is_default));
        const secret = partner && (partner.secret || (partner.uses_legacy_secret ? process.env["NFC_PAY_SECRET"] : undefined));
        if (!partner || !secret) return json({ error: "Unknown partner." }, 401);
        const ts = request.headers.get("x-hme-timestamp") ?? "";
        const sig = request.headers.get("x-hme-signature") ?? "";
        if (!/^\d{10}$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return json({ error: "Stale or missing timestamp." }, 401);
        const expected = createHmac("sha256", secret).update(`${ts}.${raw}`).digest();
        if (!/^[0-9a-f]{64}$/.test(sig) || !timingSafeEqual(expected, Buffer.from(sig, "hex"))) return json({ error: "Bad signature." }, 401);

        let body: z.infer<typeof Body>;
        try { body = Body.parse(JSON.parse(raw)); } catch { return json({ error: "Bad request." }, 400); }
        const txid = body.txid.toLowerCase().replace(/^0x/, "");

        // 2. Find the sale this transaction paid.
        const { data: txs } = await supabaseAdmin.from("transactions").select("invoice_id, tx_hash, confirmed_at, first_seen_at")
          .in("tx_hash", [txid, `0x${txid}`, body.txid]).limit(1);
        const tx = txs?.[0];
        if (!tx) return json({ status: "not_found", pop: 0, reason: "No NectarPay sale was paid by this transaction (yet)." }, 404);
        const { data: inv } = await supabaseAdmin.from("invoices").select("id, store_id, status, fiat_amount, fiat_currency, updated_at").eq("id", tx.invoice_id).maybeSingle();
        const { data: store } = inv ? await supabaseAdmin.from("stores").select("id, name, url_slug, owner_id, created_at, business_email, pop_rewards_enabled").eq("id", inv.store_id).maybeSingle() : { data: null };
        if (!inv || !store) return json({ status: "not_found", pop: 0 }, 404);

        const reply = (a: { status: string; pop: number; reason: string | null; release_at: string | null }) => json({
          status: a.status, pop: a.pop, reason: a.reason, release_at: a.release_at,
          invoice_id: inv.id, sale_usd: Number(inv.fiat_amount), store: { id: store.id, name: store.name, slug: store.url_slug },
        });

        const { data: existing } = await supabaseAdmin.from("pop_awards").select("*").eq("invoice_id", inv.id).maybeSingle();
        if (existing && (existing.status !== "held" || existing.shopper_ref !== body.shopper_ref)) {
          if (existing.shopper_ref !== body.shopper_ref) return json({ status: "denied", pop: 0, reason: "already_claimed" }, 409);
          return reply(existing);
        }

        // 3. Self-dealing checks.
        const sha = (s: string | null | undefined) => (s ? createHash("sha256").update(s.trim().toLowerCase()).digest("hex") : null);
        const { data: owner } = await supabaseAdmin.auth.admin.getUserById(store.owner_id);
        const ownerHashes = [sha(owner?.user?.email), sha(store.business_email)].filter(Boolean);
        const shopperIsOwner = !!body.shopper_email_sha256 && ownerHashes.includes(body.shopper_email_sha256);
        let payerIsStoreWallet = false;
        if (body.payer_addresses.length) {
          const { count } = await supabaseAdmin.from("invoices").select("id", { count: "exact", head: true })
            .eq("store_id", store.id).in("address", body.payer_addresses);
          payerIsStoreWallet = (count ?? 0) > 0;
        }

        // 4. Daily caps (UTC day), excluding this sale.
        const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
        const { data: today } = await supabaseAdmin.from("pop_awards").select("pop, shopper_ref, invoice_id")
          .eq("store_id", store.id).eq("status", "eligible").gte("created_at", dayStart.toISOString());
        const others = (today ?? []).filter((r) => r.invoice_id !== inv.id);
        const { decideAward } = await import("@/lib/pop-rewards");
        const d = decideAward({
          invoiceStatus: inv.status, fiatCurrency: inv.fiat_currency, saleUsd: Number(inv.fiat_amount),
          paidAt: new Date(tx.confirmed_at ?? tx.first_seen_at ?? inv.updated_at), storeCreatedAt: new Date(store.created_at),
          storeEnabled: store.pop_rewards_enabled, shopperIsOwner, payerIsStoreWallet,
          shopperStorePopToday: others.filter((r) => r.shopper_ref === body.shopper_ref).reduce((s, r) => s + r.pop, 0),
          storePopToday: others.reduce((s, r) => s + r.pop, 0), now: new Date(),
        });
        if (d.status === "denied" && d.reason === "sale_not_paid") return json({ status: "not_ready", pop: 0, reason: "Sale is not confirmed yet; try again shortly." }, 202);

        const row = {
          invoice_id: inv.id, store_id: store.id, partner_id: partner.id, txid, shopper_ref: body.shopper_ref,
          sale_usd: Number(inv.fiat_amount), pop: d.pop, status: d.status, reason: d.reason,
          release_at: d.releaseAt?.toISOString() ?? null, updated_at: new Date().toISOString(),
        };
        const { data: saved, error } = await supabaseAdmin.from("pop_awards").upsert(row, { onConflict: "invoice_id" }).select("*").single();
        if (error || !saved) return json({ error: "Could not record the award." }, 500);
        return reply(saved);
      },
    },
  },
});
