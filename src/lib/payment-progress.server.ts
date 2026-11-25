import { verifyStickerSignature, stickerResponseSignature } from "./sticker-partner";
import { PaymentProgressRequest, computeProgressUpdate, type WalletProgressEvent } from "./payment-progress";

export async function recordWalletProgress(opts: {
  invoiceId: string;
  partnerId: string;
  partnerName: string;
  requestId?: string | null;
  event: WalletProgressEvent;
  txid?: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const nowIso = new Date().toISOString();
  const normalizedTxid = opts.txid ? opts.txid.toLowerCase() : undefined;

  if (opts.requestId) {
    const { data: existing } = await supabaseAdmin
      .from("payment_progress_notices")
      .select("invoice_id, event, txid")
      .eq("partner_id", opts.partnerId)
      .eq("request_id", opts.requestId)
      .maybeSingle();
    if (existing) {
      if (existing.invoice_id !== opts.invoiceId) {
        return { ok: false as const, httpStatus: 409, error: "request_id was already used for a different invoice." };
      }
      const { data: inv } = await supabaseAdmin
        .from("invoices")
        .select("status, wallet_txid")
        .eq("id", opts.invoiceId)
        .maybeSingle();
      const invStatus = inv?.status ?? "pending";
      const settled = invStatus === "confirmed" || invStatus === "overpaid";
      return {
        ok: true as const,
        httpStatus: 200,
        body: {
          accepted: true,
          duplicate: true,
          request_id: opts.requestId,
          invoice_id: opts.invoiceId,
          event: existing.event,
          txid: existing.txid ?? inv?.wallet_txid ?? null,
          status: settled ? invStatus : existing.event === "payment_submitted" ? "verifying" : "paying",
          invoice_status: invStatus,
          ...(settled ? { already_settled: true } : {}),
        },
      };
    }
  }

  const { data: inv, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, status, wallet_event, wallet_txid, wallet_submitted_at")
    .eq("id", opts.invoiceId)
    .maybeSingle();
  if (invErr) return { ok: false as const, httpStatus: 503, error: "Invoice lookup unavailable." };
  if (!inv) return { ok: false as const, httpStatus: 404, error: "Invoice not found." };

  const { count: txCount } = await supabaseAdmin
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("invoice_id", inv.id);

  const decision = computeProgressUpdate(
    {
      status: inv.status,
      walletEvent: inv.wallet_event,
      walletTxid: inv.wallet_txid,
      walletSubmittedAt: inv.wallet_submitted_at,
      hasOnChainTx: (txCount ?? 0) > 0,
    },
    { event: opts.event, ...(normalizedTxid ? { txid: normalizedTxid } : {}) },
    opts.partnerName,
    nowIso,
  );

  if (opts.requestId && decision.accepted) {
    await supabaseAdmin
      .from("payment_progress_notices")
      .upsert(
        {
          partner_id: opts.partnerId,
          request_id: opts.requestId,
          invoice_id: inv.id,
          event: opts.event,
          txid: normalizedTxid ?? null,
          received_at: nowIso,
        },
        { onConflict: "partner_id,request_id", ignoreDuplicates: true },
      );
  }

  if (decision.apply && decision.patch) {
    const { error: updErr } = await supabaseAdmin
      .from("invoices")
      .update(decision.patch)
      .eq("id", inv.id)
      .in("status", ["pending", "detected", "underpaid"]);
    if (updErr) return { ok: false as const, httpStatus: 503, error: "Could not record payment progress." };
  }

  return {
    ok: true as const,
    httpStatus: decision.httpStatus,
    body: {
      accepted: decision.accepted,
      ...(opts.requestId ? { request_id: opts.requestId } : {}),
      invoice_id: inv.id,
      event: opts.event,
      txid: decision.patch?.wallet_txid ?? normalizedTxid ?? inv.wallet_txid ?? null,
      status: decision.publicStatus,
      invoice_status: inv.status,
      ...(decision.alreadySettled ? { already_settled: true } : {}),
      ...(decision.reason ? { reason: decision.reason } : {}),
    },
  };
}

export async function handlePaymentProgress(request: Request) {
  const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const raw = await request.text();
  if (raw.length > 2048) return json({ error: "Request too large." }, 413);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: partners, error: partnerError } = await supabaseAdmin
    .from("card_partners")
    .select("id, name, secret, uses_legacy_secret, is_default, active");
  if (partnerError) return json({ error: "Partner authentication unavailable." }, 503);

  const pid = request.headers.get("x-hme-partner");
  const partner = (partners ?? []).find((p) => p.active && (pid ? p.id === pid : p.is_default));
  const secret = partner && (partner.secret || (partner.uses_legacy_secret ? process.env["NFC_PAY_SECRET"] : undefined));
  if (!partner || !secret || !verifyStickerSignature(secret, raw, request.headers.get("x-hme-timestamp") ?? "", request.headers.get("x-hme-signature") ?? "")) {
    return json({ error: "Invalid partner signature." }, 401);
  }

  const signed = (body: unknown, status = 200) => {
    const text = JSON.stringify(body);
    const ts = String(Math.floor(Date.now() / 1000));
    return new Response(text, {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-HME-Timestamp": ts,
        "X-HME-Signature": stickerResponseSignature(secret, raw, text, ts),
      },
    });
  };

  let input: ReturnType<typeof PaymentProgressRequest.parse>;
  try {
    input = PaymentProgressRequest.parse(JSON.parse(raw));
  } catch {
    return signed({ error: "Supply request_id (UUID), invoice_id (UUID), event ('paying' or 'payment_submitted'), and txid when submitted." }, 400);
  }

  const res = await recordWalletProgress({
    invoiceId: input.invoice_id,
    partnerId: partner.id,
    partnerName: partner.name,
    requestId: input.request_id,
    event: input.event,
    ...(input.txid ? { txid: input.txid } : {}),
  });
  if (!res.ok) return signed({ error: res.error, request_id: input.request_id }, res.httpStatus);
  return signed(res.body, res.httpStatus);
}