package money.honest.nectarpos

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor plugin surface for Tangem card tap-to-pay.
 *
 * NOTE: the native Tangem SDK integration is not yet wired. This stub keeps
 * the APK building and gives the JS layer a clear, actionable error instead
 * of "plugin not implemented". The web-side flow (startTangemPayment /
 * submitTangemPayment) is fully functional and can be exercised in a
 * browser via /dev/tangem-test.
 *
 * When the real SDK is wired, replace the reject calls with:
 *   scan()     → TangemSdk.scanCard(...) → return { cardId, publicKey, ethAddress }
 *   signHash() → TangemSdk.sign(...)     → return { signature } (64-byte r||s)
 */
@CapacitorPlugin(name = "Tangem")
class TangemPaymentPlugin : Plugin() {

    @PluginMethod
    fun scan(call: PluginCall) {
        call.reject(
            "NOT_IMPLEMENTED",
            "Native Tangem SDK not yet wired in this APK build. Use /dev/tangem-test in a browser for now."
        )
    }

    @PluginMethod
    fun signHash(call: PluginCall) {
        call.reject(
            "NOT_IMPLEMENTED",
            "Native Tangem SDK not yet wired in this APK build."
        )
    }
}
