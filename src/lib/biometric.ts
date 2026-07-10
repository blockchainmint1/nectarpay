// Biometric unlock for the merchant app (Face ID / Touch ID / Android
// BiometricPrompt). No-op on the web build and on the Senraise terminal —
// terminals sit unattended in-store and merchants set a numeric PIN there
// instead (see pos-settings).

import { useEffect, useState } from "react";
import { isMerchantApp } from "./app-mode";

type UnlockState = "idle" | "checking" | "unlocked" | "denied" | "unavailable";

async function tryUnlock(): Promise<UnlockState> {
  if (!isMerchantApp()) return "unlocked";
  try {
    const mod = await import("@aparajita/capacitor-biometric-auth");
    const { BiometricAuth } = mod;
    const info = await BiometricAuth.checkBiometry();
    if (!info.isAvailable) return "unavailable";
    await BiometricAuth.authenticate({
      reason: "Unlock NectarPay",
      cancelTitle: "Cancel",
      allowDeviceCredential: true,
      iosFallbackTitle: "Use passcode",
      androidTitle: "Unlock NectarPay",
      androidSubtitle: "Confirm it's you to view merchant data.",
      androidConfirmationRequired: false,
    });
    return "unlocked";
  } catch (err) {
    console.warn("[biometric] denied or failed", err);
    return "denied";
  }
}

/**
 * Gates a subtree behind a biometric prompt. Resolves to "unlocked" on
 * web and terminal builds so no UI is blocked. On the merchant native
 * app it prompts on mount; user can retry on denial.
 */
export function useBiometricUnlock(): {
  state: UnlockState;
  retry: () => void;
} {
  const [state, setState] = useState<UnlockState>(
    isMerchantApp() ? "checking" : "unlocked",
  );

  useEffect(() => {
    if (!isMerchantApp()) return;
    let cancelled = false;
    tryUnlock().then((r) => {
      if (!cancelled) setState(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    state,
    retry: () => {
      setState("checking");
      tryUnlock().then(setState);
    },
  };
}
