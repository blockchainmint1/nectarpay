import { describe, expect, it } from "vitest";
import { PaymentProgressRequest, buildProgressView, computeProgressUpdate, SLOW_VERIFY_MS } from "./payment-progress";

const reqId = "dc48a500-9a25-43de-a3c5-5e5d38360114";
const invId = "8c9f3a20-1111-4b22-9c33-1234567890ab";
const txcTxid = "9573726df81ddb1c120c9737a477ecd48ccb73ef73ea850caa156abd7d639861";
const evmTxid = "0x5c700f2ab2ffcb5ca6845d36485627825c8f384f5ae9919f47fc258720952838";
const nowIso = "2026-11-25T16:15:00.000Z";

describe("payment progress request validation", () => {
  it("accepts paying without txid and payment_submitted with TXC or EVM txid", () => {
    expect(PaymentProgressRequest.parse({ request_id: reqId, invoice_id: invId, event: "paying" }).event).toBe("paying");
    expect(PaymentProgressRequest.parse({ request_id: reqId, invoice_id: invId, event: "payment_submitted", txid: txcTxid }).txid).toBe(txcTxid);
    expect(PaymentProgressRequest.parse({ request_id: reqId, invoice_id: invId, event: "payment_submitted", txid: evmTxid.toUpperCase() }).txid).toBe(evmTxid);
  });

  it("rejects payment_submitted without txid, bad txids, and extra paid/status fields", () => {
    expect(PaymentProgressRequest.safeParse({ request_id: reqId, invoice_id: invId, event: "payment_submitted" }).success).toBe(false);
    expect(PaymentProgressRequest.safeParse({ request_id: reqId, invoice_id: invId, event: "payment_submitted", txid: "not-hex" }).success).toBe(false);
    expect(PaymentProgressRequest.safeParse({ request_id: reqId, invoice_id: invId, event: "payment_submitted", txid: txcTxid, status: "confirmed" }).success).toBe(false);
    expect(PaymentProgressRequest.safeParse({ request_id: reqId, invoice_id: invId, event: "payment_submitted", txid: txcTxid, paid: true }).success).toBe(false);
  });
});

describe("payment progress state safety", () => {
  it("never moves a confirmed or overpaid invoice backward", () => {
    for (const status of ["confirmed", "overpaid"]) {
      const res = computeProgressUpdate(
        { status, walletEvent: null, walletTxid: null, walletSubmittedAt: null, hasOnChainTx: true },
        { event: "payment_submitted", txid: txcTxid },
        "CryptoPOP",
        nowIso,
      );
      expect(res.apply).toBe(false);
      expect(res.alreadySettled).toBe(true);
      expect(res.publicStatus).toBe(status);
    }
  });

  it("rejects expired, cancelled, and failed invoices", () => {
    for (const status of ["expired", "cancelled", "failed"]) {
      const res = computeProgressUpdate(
        { status, walletEvent: null, walletTxid: null, walletSubmittedAt: null, hasOnChainTx: false },
        { event: "payment_submitted", txid: txcTxid },
        "CryptoPOP",
        nowIso,
      );
      expect(res.accepted).toBe(false);
      expect(res.apply).toBe(false);
      expect(res.httpStatus).toBe(409);
    }
  });

  it("never downgrades payment_submitted back to paying", () => {
    const res = computeProgressUpdate(
      { status: "pending", walletEvent: "payment_submitted", walletTxid: txcTxid, walletSubmittedAt: nowIso, hasOnChainTx: false },
      { event: "paying" },
      "CryptoPOP",
      "2026-11-25T16:15:05.000Z",
    );
    expect(res.accepted).toBe(true);
    expect(res.apply).toBe(false);
    expect(res.publicStatus).toBe("verifying");
  });

  it("keeps the first submitted timestamp and never overwrites an on-chain txid", () => {
    const firstIso = "2026-11-25T16:14:00.000Z";
    const res = computeProgressUpdate(
      { status: "detected", walletEvent: "payment_submitted", walletTxid: txcTxid, walletSubmittedAt: firstIso, hasOnChainTx: true },
      { event: "payment_submitted", txid: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      "CryptoPOP",
      nowIso,
    );
    expect(res.patch?.wallet_submitted_at).toBe(firstIso);
    expect(res.patch?.wallet_txid).toBe(txcTxid);
  });
});

describe("progress view copy and slow-verification transition", () => {
  it("shows paying state with partner name and switches to verifying then slow without claiming paid", () => {
    const paying = buildProgressView({
      invoiceStatus: "pending",
      walletProgress: { event: "paying", eventAt: nowIso, partnerName: "CryptoPOP", txid: null, submittedAt: null },
    });
    expect(paying.active).toBe(true);
    expect(paying.stage).toBe("paying");
    expect(paying.lines[0]).toContain("CryptoPOP");

    const submittedMs = new Date(nowIso).getTime();
    const fresh = buildProgressView({
      invoiceStatus: "pending",
      walletProgress: { event: "payment_submitted", eventAt: nowIso, partnerName: "CryptoPOP", txid: txcTxid, submittedAt: nowIso },
      nowMs: submittedMs + 5_000,
    });
    expect(fresh.stage).toBe("submitted");
    expect(fresh.headline).toBe("Payment submitted");
    expect(fresh.subheadline).toBe("Verifying on chain…");

    const slow = buildProgressView({
      invoiceStatus: "pending",
      walletProgress: { event: "payment_submitted", eventAt: nowIso, partnerName: "CryptoPOP", txid: txcTxid, submittedAt: nowIso },
      nowMs: submittedMs + SLOW_VERIFY_MS + 1_000,
    });
    expect(slow.stage).toBe("slow");
    expect(slow.headline).toBe("Still verifying this payment");
    expect(slow.txid).toBe(txcTxid);
  });
});