/**
 * Terminal hardware identity + installed app version.
 *
 * Backed by the native NectarDevice Capacitor plugin (APK 0.1.19+). On the
 * web — or in an older APK that predates the plugin — every field is null
 * and `supported` is false, so callers can render "unknown" gracefully.
 */

export interface PosDeviceInfo {
  supported: boolean;
  serial: string | null;
  serialSource: string | null;
  androidId: string | null;
  model: string | null;
  manufacturer: string | null;
  device: string | null;
  androidVersion: string | null;
  sdkInt: number | null;
  appVersion: string | null;
  appBuild: string | null;
}

const EMPTY: PosDeviceInfo = {
  supported: false,
  serial: null,
  serialSource: null,
  androidId: null,
  model: null,
  manufacturer: null,
  device: null,
  androidVersion: null,
  sdkInt: null,
  appVersion: null,
  appBuild: null,
};

interface DevicePlugin {
  getInfo: () => Promise<Omit<PosDeviceInfo, "supported">>;
}

function plugin(): DevicePlugin | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Capacitor?: { Plugins?: { NectarDevice?: DevicePlugin } } };
  return w.Capacitor?.Plugins?.NectarDevice ?? null;
}

let cached: PosDeviceInfo | null = null;

export async function getDeviceInfo(): Promise<PosDeviceInfo> {
  if (cached) return cached;
  const p = plugin();
  if (!p) {
    // Older APKs without the plugin: still try @capacitor/app for a version.
    let appVersion: string | null = null;
    let appBuild: string | null = null;
    try {
      const { isNative } = await import("@/lib/pos-native");
      if (isNative()) {
        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        appVersion = info.version ?? null;
        appBuild = info.build ?? null;
      }
    } catch {
      // ignore
    }
    cached = { ...EMPTY, appVersion, appBuild };
    return cached;
  }
  try {
    const info = await p.getInfo();
    cached = { ...EMPTY, ...info, supported: true };
  } catch {
    cached = EMPTY;
  }
  return cached;
}

/** Best available stable hardware id for assigning a terminal to a merchant. */
export function deviceIdentity(info: PosDeviceInfo): string | null {
  return info.serial ?? info.androidId ?? null;
}
