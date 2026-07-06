package money.honest.nectarpos

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.tangem.TangemSdk
import com.tangem.common.CompletionResult
import com.tangem.common.core.Config
import com.tangem.sdk.extensions.init
import org.web3j.crypto.Keys
import org.web3j.utils.Numeric

/**
 * Capacitor plugin wrapping the Tangem Android SDK for USDC-on-ETH tap-to-pay.
 *
 *   scan()      → reads the card's uncompressed secp256k1 public key + derived
 *                 EIP-55 Ethereum address. Signing key material never leaves
 *                 the card.
 *   signHash()  → asks the card's secure element to sign a 32-byte digest,
 *                 returning a 64-byte r||s (no v).
 *
 * The web layer sits between these two calls, hitting the backend server
 * functions `startTangemPayment` and `submitTangemPayment` to build/broadcast
 * the ERC-20 Transfer transaction.
 */
@CapacitorPlugin(name = "Tangem")
class TangemPaymentPlugin : Plugin() {

    private var sdk: TangemSdk? = null

    override fun load() {
        try {
            sdk = TangemSdk.init(activity, Config())
        } catch (t: Throwable) {
            // The plugin still registers so JS calls surface a clear reject
            // instead of "plugin not implemented".
            sdk = null
        }
    }

    private fun requireSdk(call: PluginCall): TangemSdk? {
        val s = sdk
        if (s == null) call.reject("SDK_INIT_FAILED", "Tangem SDK failed to initialise")
        return s
    }

    @PluginMethod
    fun scan(call: PluginCall) {
        val s = requireSdk(call) ?: return
        s.scanCard(initialMessage = null) { result ->
            when (result) {
                is CompletionResult.Success -> {
                    val card = result.data
                    val wallet = card.wallets.firstOrNull { it.curve.name.contains("Secp256k1", ignoreCase = true) }
                    if (wallet == null) {
                        call.reject("NO_SECP256K1_WALLET", "Card has no secp256k1 wallet")
                        return@scanCard
                    }
                    val pubKeyHex = Numeric.toHexString(wallet.publicKey)
                    val ethAddress = Keys.toChecksumAddress(
                        Keys.getAddress(Numeric.toHexStringNoPrefix(wallet.publicKey))
                    )
                    val js = JSObject().apply {
                        put("cardId", card.cardId)
                        put("publicKey", pubKeyHex)
                        put("ethAddress", ethAddress)
                        put("curve", "secp256k1")
                    }
                    call.resolve(js)
                }
                is CompletionResult.Failure -> {
                    call.reject(result.error.code.toString(), result.error.localizedMessage ?: "Scan failed")
                }
            }
        }
    }

    @PluginMethod
    fun signHash(call: PluginCall) {
        val s = requireSdk(call) ?: return
        val cardId = call.getString("cardId") ?: return call.reject("MISSING_CARD_ID")
        val publicKeyHex = call.getString("publicKey") ?: return call.reject("MISSING_PUBLIC_KEY")
        val hashHex = call.getString("hash") ?: return call.reject("MISSING_HASH")

        val publicKey = Numeric.hexStringToByteArray(publicKeyHex)
        val hash = Numeric.hexStringToByteArray(hashHex)
        if (hash.size != 32) return call.reject("BAD_HASH", "Expected 32-byte digest")

        s.sign(
            hashes = arrayOf(hash),
            walletPublicKey = publicKey,
            cardId = cardId,
            derivationPath = null,
            initialMessage = null,
        ) { result ->
            when (result) {
                is CompletionResult.Success -> {
                    val signatures = result.data.signatures
                    if (signatures.isEmpty()) {
                        call.reject("NO_SIGNATURE")
                        return@sign
                    }
                    val sigHex = Numeric.toHexString(signatures[0])
                    val js = JSObject().apply { put("signature", sigHex) }
                    call.resolve(js)
                }
                is CompletionResult.Failure -> {
                    call.reject(result.error.code.toString(), result.error.localizedMessage ?: "Sign failed")
                }
            }
        }
    }
}
