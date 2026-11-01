import { z } from "zod";
import { MAX_SIGNATURE_CHARS, parseSignatureDataUrl } from "./sale-signature";

export const FAST_CONSENT_VERSION = "2026-11-01";
export const FAST_SIGNATURE_BUCKET = "fast-start-signatures";
export const FAST_ACKNOWLEDGEMENTS = {
  nonCustodial: "Payments go directly to my wallet. NectarPay holds neither my funds nor my private keys and cannot recover lost keys. Keeping my coin and wallet secure is my responsibility.",
  basicSetup: "I start with TSD on TEXITcoin only. Instant acceptance happens before block confirmation. I can complete my account and improve my listing and settings later.",
} as const;
export const fastConsentSchema = z.object({
  nonCustodial: z.literal(true, { errorMap: () => ({ message: "Please acknowledge that NectarPay is non-custodial." }) }),
  basicSetup: z.literal(true, { errorMap: () => ({ message: "Please acknowledge the Fast Start setup and instant payment risk." }) }),
  directoryOptIn: z.boolean(),
  signature: z.string().max(MAX_SIGNATURE_CHARS).refine((v) => parseSignatureDataUrl(v) !== null, "Please add your signature."),
});
export function fastConsentRecord(directoryOptIn: boolean) {
  return { version: FAST_CONSENT_VERSION, ...FAST_ACKNOWLEDGEMENTS, nonCustodialAccepted: true, basicSetupAccepted: true, directoryOptIn };
}