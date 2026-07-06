/**
 * Thin wrappers around the native Capacitor plugins the POS app uses on
 * Senraise terminals. Every function no-ops (or returns a safe default) in
 * a normal browser, so the same `/pos/*` routes keep working on any
 * device.
 *
 * Detect native context with `isNative()` before calling native-only APIs.
 */

type TagRecord = {
  tnf: number;
  type: string;
  uri?: string;
  text?: string;
  mime?: string;
  raw: string;
};

export type TagParsed =
  | { format: "nectar-json"; version: number; address: string; chain: string; token?: string; amount?: number; label?: string }
  | { format: "nectar-uri"; uri: string }
  | { format: "pay-uri"; chain: string; address: string; uri: string; token?: string; amount?: number; label?: string; chainId?: string }
  | { format: "address"; chain: string; address: string }
  | { format: "url"; uri: string }
  | { format: "unknown" }
  | { format: "error"; error: string };

export interface TagEvent {
  action: string;
  uid: string | null;
  records: TagRecord[];
  parsed: TagParsed;
}

export interface ReceiptLine {
  text?: string;
  right?: string;
  bold?: boolean;
  size?: number;
  divider?: boolean;
}

export interface ReceiptPayload {
  header?: string;
  lines: ReceiptLine[];
  qr?: string;
  footer?: string;
}

interface CapacitorGlobal {
  isNativePlatform: () => boolean;
  Plugins: {
    NectarPrinter?: {
      isAvailable: () => Promise<{ available: boolean }>;
      printText: (o: { text: string }) => Promise<void>;
      printReceipt: (o: ReceiptPayload) => Promise<void>;
      printBitmap: (o: { base64: string }) => Promise<void>;
      feed: (o: { lines: number }) => Promise<void>;
    };
    NectarNfc?: {
      startReader: () => Promise<{ started: boolean }>;
      stopReader: () => Promise<void>;
      addListener: (
        eventName: "tagScanned" | "tagError",
        cb: (data: TagEvent | { error: string }) => void,
      ) => Promise<{ remove: () => Promise<void> }>;
    };
  };
}

function cap(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Capacitor?: CapacitorGlobal };
  return w.Capacitor ?? null;
}

export function isNative(): boolean {
  return cap()?.isNativePlatform() === true;
}

export const NectarPrinter = {
  async isAvailable(): Promise<boolean> {
    const p = cap()?.Plugins.NectarPrinter;
    if (!p) return false;
    try {
      const { available } = await p.isAvailable();
      return available;
    } catch {
      return false;
    }
  },
  async printReceipt(payload: ReceiptPayload): Promise<void> {
    const p = cap()?.Plugins.NectarPrinter;
    if (!p) throw new Error("Printer not available on this device");
    await p.printReceipt(payload);
  },
  async feed(lines = 3): Promise<void> {
    const p = cap()?.Plugins.NectarPrinter;
    if (!p) return;
    await p.feed({ lines });
  },
};

export const NectarNfc = {
  async start(onTag: (e: TagEvent) => void, onError?: (msg: string) => void) {
    const p = cap()?.Plugins.NectarNfc;
    if (!p) return { remove: async () => {} };
    await p.startReader();
    const sub = await p.addListener("tagScanned", (data) => {
      onTag(data as TagEvent);
    });
    let errSub: { remove: () => Promise<void> } | null = null;
    if (onError) {
      errSub = await p.addListener("tagError", (data) => {
        onError((data as { error: string }).error);
      });
    }
    return {
      remove: async () => {
        await sub.remove();
        if (errSub) await errSub.remove();
        try { await p.stopReader(); } catch { /* ignore */ }
      },
    };
  },
};
