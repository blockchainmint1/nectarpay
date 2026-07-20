// Inbound webhook: partner sites (BlockchainMint, mineTXC, IDMC) tell us
// when a sale that carried one of our affiliate codes reached paid status.
//
// Auth: Bearer NECTARPAY_AFFILIATE_SECRET, plus optional HMAC in
// X-Nectar-Signature: t=<unix>,v1=<hex-sha256 of `${t}.${rawBody}`>.
//
// Idempotent on (source, external_order_id).

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Nectar-Signature",
} as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const Body = z.object({
  source: z.enum(["blockchainmint", "minetxc", "idmc"]),
  external_order_id: z.string().min(1).max(128),
  order_number: z.string().max(64).nullable().optional(),
  affiliate_code: z.string().min(1).max(64),
  total_usd: z.number().nonnegative(),
  currency: z.string().max(8).default("USD"),
  paid_at: z.string().datetime().optional(),
  customer_email_hash: z.string().max(256).nullable().optional(),
});

function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function verifySignature(header: string | null, raw: string, secret: string): boolean {
  if (!header) return true; // optional in v1 — bearer alone is acceptable
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("=") as [string, string]),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  // 5-minute replay window
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
  if (!Number.isFinite(ageSec) || ageSec > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return safeEq(v1, expected);
}

export const Route = createFileRoute("/api/public/v1/hooks/affiliate-sale")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const secret = process.env.NECTARPAY_AFFILIATE_SECRET;
        if (!secret) return json({ error: "Not configured" }, 500);

        const auth = request.headers.get("authorization") ?? "";
        if (auth !== `Bearer ${secret}`) return json({ error: "Unauthorized" }, 401);

        const raw = await request.text();
        if (!verifySignature(request.headers.get("x-nectar-signature"), raw, secret)) {
          return json({ error: "Invalid signature" }, 401);
        }

        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(JSON.parse(raw));
        } catch (e) {
          return json({ error: (e as Error).message }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Resolve the affiliate user (best-effort; we log even if unknown).
        const { data: codeRow } = await supabaseAdmin
          .from("affiliate_codes")
          .select("user_id")
          .eq("code", parsed.affiliate_code)
          .maybeSingle();

        const affiliate_user_id = (codeRow as { user_id: string } | null)?.user_id ?? null;

        // Idempotent upsert on (source, external_order_id).
        const { data: existing } = await supabaseAdmin
          .from("affiliate_external_sales")
          .select("id")
          .eq("source", parsed.source)
          .eq("external_order_id", parsed.external_order_id)
          .maybeSingle();

        if (existing) {
          return json({ ok: true, id: (existing as { id: string }).id, deduped: true });
        }

        const { data: inserted, error } = await supabaseAdmin
          .from("affiliate_external_sales")
          .insert({
            source: parsed.source,
            external_order_id: parsed.external_order_id,
            order_number: parsed.order_number ?? null,
            affiliate_code: parsed.affiliate_code,
            affiliate_user_id,
            total_usd: parsed.total_usd,
            currency: parsed.currency,
            paid_at: parsed.paid_at ?? new Date().toISOString(),
            customer_email_hash: parsed.customer_email_hash ?? null,
            raw_payload: JSON.parse(raw),
          })
          .select("id")
          .single();

        if (error || !inserted) {
          return json({ error: error?.message ?? "Insert failed" }, 500);
        }

        return json({ ok: true, id: (inserted as { id: string }).id, deduped: false });
      },
    },
  },
});
