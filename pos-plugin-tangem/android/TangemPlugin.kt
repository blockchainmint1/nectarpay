package money.honest.nectarpay.tangem

import android.app.Activity
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
 * Capacitor plugin wrapping the Tangem Android SDK.
 *
 * scan()      -> reads the card's Ethereum-usable public key
 * signHash()  -> asks the card's secure element to sign a 32-byte digest
 *
 * Signing key material never leaves the card. This plugin is a thin bridge
 * between the POS webview and the Tangem SDK's NFC session.
 */
@CapacitorPlugin(name = "Tangem")
class TangemPlugin : Plugin() {

    private lateinit var sdk: TangemSdk

    override fun load() {
        val activity: Activity = activity
        sdk = TangemSdk.init(activity, Config())
    }

    @PluginMethod
    fun scan(call: PluginCall) {
        sdk.scanCard(initialMessage = null) { result ->
            when (result) {
                is CompletionResult.Success -> {
                    val card = result.data
                    val wallet = card.wallets.firstOrNull { it.curve.name.contains("Secp256k1") }
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
        val cardId = call.getString("cardId") ?: return call.reject("MISSING_CARD_ID")
        val publicKeyHex = call.getString("publicKey") ?: return call.reject("MISSING_PUBLIC_KEY")
        val hashHex = call.getString("hash") ?: return call.reject("MISSING_HASH")

        val publicKey = Numeric.hexStringToByteArray(publicKeyHex)
        val hash = Numeric.hexStringToByteArray(hashHex)
        if (hash.size != 32) return call.reject("BAD_HASH", "Expected 32-byte digest")

        sdk.sign(
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
