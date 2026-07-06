import { WebPlugin } from "@capacitor/core";
import type {
  TangemPlugin,
  TangemScanResult,
  TangemSignInput,
  TangemSignResult,
} from "./definitions";

/**
 * Web/dev fallback: Tangem NFC requires the native Android SDK. In a browser
 * we throw a clear error so developers aren't surprised. For a browser-based
 * dev harness, mock this class in your test setup.
 */
export class TangemWeb extends WebPlugin implements TangemPlugin {
  async scan(): Promise<TangemScanResult> {
    throw this.unavailable(
      "Tangem NFC is only available in the NectarPOS Android app.",
    );
  }
  async signHash(_options: TangemSignInput): Promise<TangemSignResult> {
    throw this.unavailable(
      "Tangem NFC is only available in the NectarPOS Android app.",
    );
  }
}
