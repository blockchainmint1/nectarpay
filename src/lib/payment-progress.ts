import { z } from "zod";

export const TXID_RE = /^(?:0x)?[0-9a-f]{64}$/i;

export const PaymentProgressRequest = z
  .object({
    request_id: z.string().uuid(),
    invoice_id: z.string().uuid(),
    event: z.enum(["paying", "payment_submitted"]),
    txid: z.string().regex(TXID_RE, "Supply a 64-character hex transaction ID.").optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.event === "payment_submitted" && !val.txid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["txid"], message: "txid is required when event is payment_submitted." });
    }
  })
  .transform((val) => ({
    ...val,
    txid: val.txid ? val.txid.toLowerCase() : undefined,
  }));

export type PaymentProgressInput = z.infer<typeof PaymentProgressRequest>;
export type WalletProgressEvent = "paying" | "payment_submitted";

export type WalletProgressInfo = {
  event: WalletProgressEvent | null;
  eventAt: string | null;
  partnerName: string | null;
  txid: string | null;
  submittedAt: string | null;
};

export const SETTLED_STATUSES = new Set(["confirmed", "overpaid"]);
export const CLOSED_STATUSES = new Set(["expired", "cancelled", "failed"]);
export const SLOW_VERIFY_MS = 30_000;

export function computeProgressUpdate(
  current: {
    status: string;
    walletEvent: string | null;
    walletTxid: string | null;
    walletSubmittedAt: string | null;
    hasOnChainTx: boolean;
  },
  incoming: { event: WalletProgressEvent; txid?: string },
  partnerName: string,
  nowIso: string,
): {
  accepted: boolean;
  apply: boolean;
  httpStatus: number;
  publicStatus: string;
  alreadySettled?: boolean;
  reason?: string;
  patch?: {
    wallet_event: WalletProgressEvent;
    wallet_event_at: string;
    wallet_partner_name: string;
    wallet_txid?: string | null;
    wallet_submitted_at?: string | null;
  };
} {
  if (SETTLED_STATUSES.has(current.status)) {
    return { accepted: true, apply: false, httpStatus: 200, publicStatus: current.status, alreadySettled: true };
  }
  if (CLOSED_STATUSES.has(current.status)) {
    return { accepted: false, apply: false, httpStatus: 409, publicStatus: current.status, reason: `Invoice is already ${current.status}.` };
  }
  if (current.walletEvent === "payment_submitted" && incoming.event === "paying") {
    return { accepted: true, apply: false, httpStatus: 200, publicStatus: "verifying" };
  }
  if (incoming.event === "payment_submitted") {
    const keepExistingTx = current.hasOnChainTx && !!current.walletTxid;
    return {
      accepted: true,
      apply: true,
      httpStatus: 200,
      publicStatus: "verifying",
      patch: {
        wallet_event: "payment_submitted",
        wallet_event_at: nowIso,
        wallet_partner_name: partnerName,
        wallet_txid: keepExistingTx ? current.walletTxid : (incoming.txid ?? current.walletTxid ?? null),
        wallet_submitted_at: current.walletSubmittedAt ?? nowIso,
      },
    };
  }
  return {
    accepted: true,
    apply: true,
    httpStatus: 200,
    publicStatus: "paying",
    patch: {
      wallet_event: "paying",
      wallet_event_at: nowIso,
      wallet_partner_name: partnerName,
    },
  };
}

export type ProgressView = {
  active: boolean;
  stage: "paying" | "submitted" | "slow" | "detected";
  headline: string;
  subheadline: string;
  lines: string[];
  txid: string | null;
  partnerName: string | null;
  slow: boolean;
};

export function buildProgressView(opts: {
  invoiceStatus: string;
  walletProgress?: WalletProgressInfo | null;
  onChainTxHash?: string | null;
  nowMs?: number;
}): ProgressView {
  const { invoiceStatus, walletProgress, onChainTxHash, nowMs = Date.now() } = opts;
  const partner = walletProgress?.partnerName?.trim() || null;
  const walletLabel = partner || "the wallet";
  const txid = onChainTxHash || walletProgress?.txid || null;

  if (invoiceStatus === "detected") {
    return {
      active: true,
      stage: "detected",
      headline: "Seen on chain — confirming…",
      subheadline: "Transaction spotted on the network. Locking it in now.",
      lines: [
        "Spotted on the blockchain! Just waiting for it to lock in.",
        "Almost there — the network is confirming the transfer now.",
        "It's so much faster with the other guys, but that's a small price to pay for cheap transactions!",
      ],
      txid,
      partnerName: partner,
      slow: false,
    };
  }

  if (invoiceStatus !== "pending" || !walletProgress?.event) {
    return { active: false, stage: "paying", headline: "", subheadline: "", lines: [], txid: null, partnerName: partner, slow: false };
  }

  if (walletProgress.event === "payment_submitted") {
    const submittedMs = walletProgress.submittedAt ? new Date(walletProgress.submittedAt).getTime() : NaN;
    const elapsed = Number.isFinite(submittedMs) ? Math.max(0, nowMs - submittedMs) : 0;
    const slow = elapsed >= SLOW_VERIFY_MS;
    return {
      active: true,
      stage: slow ? "slow" : "submitted",
      headline: slow ? "Still verifying this payment" : "Payment submitted",
      subheadline: slow ? "Waiting for the network to catch up — no need to pay again." : "Verifying on chain…",
      lines: slow
        ? [
            "Still verifying this payment on the network — hang tight, no need to pay again.",
            "It's so much faster with the other guys, but that's a small price to pay for cheap transactions!",
            "We have the transaction reference and keep checking automatically.",
          ]
        : [
            "Oh boy, they just sent it — money is coming!",
            `${partner ? `${partner} broadcast the payment` : "Payment broadcast received"} — checking the network now.`,
            "It's so much faster with the other guys, but that's a small price to pay for cheap transactions!",
          ],
      txid,
      partnerName: partner,
      slow,
    };
  }

  return {
    active: true,
    stage: "paying",
    headline: partner ? `${partner} is paying` : "Wallet connected",
    subheadline: "Waiting for the shopper to hit Send…",
    lines: [
      `I'm told that ${walletLabel} is paying right now!`,
      "The QR was scanned — waiting for the shopper to tap Send.",
      "Hold tight, the wallet is getting the payment ready.",
    ],
    txid: null,
    partnerName: partner,
    slow: false,
  };
}