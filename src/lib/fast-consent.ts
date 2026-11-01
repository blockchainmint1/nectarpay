import { z } from "zod";
import { MAX_SIGNATURE_CHARS, parseSignatureDataUrl } from "./sale-signature";

export const FAST_CONSENT_VERSION = "2026-11-01";
export const FAST_SIGNATURE_BUCKET = "fast-start-signatures";
export const FAST_ACKNOWLEDGEMENTS = {
  nonCustodial: "NectarPay is non-custodial. Payments go directly to my Cold Storage Coin wallet. NectarPay does not hold my funds or private keys and cannot recover lost keys. I am responsible for keeping my coin and wallet secure.",
  basicSetup: "Fast Start enables TSD on TEXITcoin only, with instant acceptance before block confirmation. Unconfirmed payments carry risk. This is a basic setup; I can complete my account and improve my listing and settings later.",
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