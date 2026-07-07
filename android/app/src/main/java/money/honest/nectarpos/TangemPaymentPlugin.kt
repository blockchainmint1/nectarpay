package money.honest.nectarpos

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.tangem.TangemSdk
import com.tangem.common.CompletionResult
import com.tangem.common.card.EllipticCurve
import com.tangem.common.core.Config
import com.tangem.sdk.extensions.init
import org.bouncycastle.jcajce.provider.digest.Keccak
import androidx.activity.ComponentActivity

/**
 * Capacitor plugin wrapping the Tangem Android SDK.
 *
 *   scan()      -> NFC session, returns { cardId, publicKey, ethAddress }
 *   signHash()  -> NFC session, asks card's secure element to sign a 32-byte
 *                  digest, returns { signature } (64 bytes: r||s, no v)
 *
 * The private key never leaves the card. The web layer builds the tx,
 * hashes it, hands the hash to signHash(), then broadcasts server-side.
 */
@CapacitorPlugin(name = "Tangem")
class TangemPaymentPlugin : Plugin() {

    private var sdk: TangemSdk? = null

    private fun getSdk(): TangemSdk {
        val existing = sdk
        if (existing != null) return existing
        val act = activity as? ComponentActivity
            ?: throw IllegalStateException("Tangem plugin requires a ComponentActivity host")
        val created = TangemSdk.init(act, Config())
        sdk = created
        return created
    }

    @PluginMethod
    fun scan(call: PluginCall) {
        try {
            getSdk().scanCard { result ->
                when (result) {
                    is CompletionResult.Success -> {
                        val card = result.data
                        val wallet = card.wallets.firstOrNull { it.curve == EllipticCurve.Secp256k1 }
                        if (wallet == null) {
                            call.reject("NO_SECP256K1_WALLET", "Card has no secp256k1 wallet")
                            return@scanCard
                        }
                        val pubKeyHex = "0x" + wallet.publicKey.toHex()
                        val ethAddress = deriveEthAddress(wallet.publicKey)
                        val js = JSObject().apply {
                            put("cardId", card.cardId)
                            put("publicKey", pubKeyHex)
                            put("ethAddress", ethAddress)
                            put("curve", "secp256k1")
                        }
                        call.resolve(js)
                    }
                    is CompletionResult.Failure -> {
                        call.reject(result.error.code.toString(), result.error.customMessage)
                    }
                }
            }
        } catch (t: Throwable) {
            call.reject("SCAN_EXCEPTION", t.message ?: t.javaClass.simpleName, t as? Exception ?: Exception(t))
        }
    }

    @PluginMethod
    fun signHash(call: PluginCall) {
        val cardId = call.getString("cardId") ?: return call.reject("MISSING_CARD_ID")
        val publicKeyHex = call.getString("publicKey") ?: return call.reject("MISSING_PUBLIC_KEY")
        val hashHex = call.getString("hash") ?: return call.reject("MISSING_HASH")

        val publicKey = try { hexToBytes(publicKeyHex) }
            catch (e: Exception) { return call.reject("BAD_PUBLIC_KEY", e.message) }
        val hash = try { hexToBytes(hashHex) }
            catch (e: Exception) { return call.reject("BAD_HASH", e.message) }
        if (hash.size != 32) return call.reject("BAD_HASH", "Expected 32-byte digest, got ${hash.size}")

        try {
            getSdk().sign(
                hash = hash,
                walletPublicKey = publicKey,
                cardId = cardId,
            ) { result ->
                when (result) {
                    is CompletionResult.Success -> {
                        val sigHex = "0x" + result.data.signature.toHex()
                        val js = JSObject().apply { put("signature", sigHex) }
                        call.resolve(js)
                    }
                    is CompletionResult.Failure -> {
                        call.reject(result.error.code.toString(), result.error.customMessage)
                    }
                }
            }
        } catch (t: Throwable) {
            call.reject("SIGN_EXCEPTION", t.message ?: t.javaClass.simpleName, t as? Exception ?: Exception(t))
        }
    }

    // ---- helpers -----------------------------------------------------------

    private fun ByteArray.toHex(): String {
        val hex = "0123456789abcdef".toCharArray()
        val out = CharArray(size * 2)
        for (i in indices) {
            val v = this[i].toInt() and 0xff
            out[i * 2] = hex[v ushr 4]
            out[i * 2 + 1] = hex[v and 0x0f]
        }
        return String(out)
    }

    private fun hexToBytes(hex: String): ByteArray {
        val clean = hex.removePrefix("0x").removePrefix("0X")
        require(clean.length % 2 == 0) { "Hex string has odd length" }
        val out = ByteArray(clean.length / 2)
        for (i in out.indices) {
            out[i] = ((Character.digit(clean[i * 2], 16) shl 4)
                + Character.digit(clean[i * 2 + 1], 16)).toByte()
        }
        return out
    }

    /**
     * Derive an EIP-55 checksummed Ethereum address from an uncompressed
     * secp256k1 public key. Accepts either 65 bytes (0x04 || X || Y) or
     * the 64-byte raw form.
     */
    private fun deriveEthAddress(publicKey: ByteArray): String {
        val raw = when {
            publicKey.size == 65 && publicKey[0].toInt() == 0x04 -> publicKey.copyOfRange(1, 65)
            publicKey.size == 64 -> publicKey
            else -> throw IllegalArgumentException("Expected 64/65-byte uncompressed pubkey, got ${publicKey.size}")
        }
        val hash = Keccak.Digest256().digest(raw)
        val addr = hash.copyOfRange(12, 32).toHex()
        // EIP-55 checksum
        val checksumHash = Keccak.Digest256().digest(addr.toByteArray(Charsets.US_ASCII)).toHex()
        val sb = StringBuilder("0x")
        for (i in addr.indices) {
            val c = addr[i]
            if (c in '0'..'9') sb.append(c)
            else sb.append(if (Character.digit(checksumHash[i], 16) >= 8) c.uppercaseChar() else c)
        }
        return sb.toString()
    }
}
