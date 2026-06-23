// Settings persisted in localStorage on the POS device.

export interface PosSettings {
  taxBps: number;             // basis points (875 = 8.75%)
  tipPresetsBps: number[];    // three slots, 0 = hide
  pinHash: string | null;     // sha-256 hex of 4-digit PIN, or null
  idleLockMs: number;         // 0 = never auto-lock
}

export const DEFAULT_SETTINGS: PosSettings = {
  taxBps: 0,
  tipPresetsBps: [1000, 1500, 2000],
  pinHash: null,
  idleLockMs: 5 * 60_000,
};

export function loadSettings(): PosSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("pos.settings");
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: PosSettings) {
  localStorage.setItem("pos.settings", JSON.stringify(s));
}

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
