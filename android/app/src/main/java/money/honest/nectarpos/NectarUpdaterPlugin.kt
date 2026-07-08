package money.honest.nectarpos

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * In-app APK downloader + installer.
 *
 * Flow:
 *   1) TS calls downloadAndInstall({ url }).
 *   2) We stream the APK to the app's cache dir (no external storage
 *      permission needed on modern Android).
 *   3) We hand a FileProvider content:// URI to Android's package
 *      installer via ACTION_VIEW. Android shows its own "Install?" prompt.
 *
 * The user must have granted REQUEST_INSTALL_PACKAGES to NectarPay itself
 * (Android 8+). On first install we send them to the settings screen with
 * ACTION_MANAGE_UNKNOWN_APP_SOURCES. Once granted, every future update is
 * two taps: "Update" in-app → "Install" in Android's system dialog.
 */
@CapacitorPlugin(name = "NectarUpdater")
class NectarUpdaterPlugin : Plugin() {

    @PluginMethod
    fun downloadAndInstall(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrBlank()) {
            call.reject("Missing 'url'")
            return
        }

        // Android 8+: app needs REQUEST_INSTALL_PACKAGES granted by user.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val pm = context.packageManager
            if (!pm.canRequestPackageInstalls()) {
                val settings = Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                    .setData(Uri.parse("package:${context.packageName}"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                try { context.startActivity(settings) } catch (_: Throwable) {}
                call.reject("Please allow NectarPay to install updates, then tap Update again.")
                return
            }
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val file = downloadTo(url, File(context.cacheDir, "nectarpay-update.apk"))
                withContext(Dispatchers.Main) { launchInstaller(file, call) }
            } catch (e: Throwable) {
                call.reject("Download failed: ${e.message ?: e.javaClass.simpleName}")
            }
        }
    }

    private fun downloadTo(urlStr: String, out: File): File {
        if (out.exists()) out.delete()
        var conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.instanceFollowRedirects = true
        conn.connectTimeout = 30_000
        conn.readTimeout = 120_000

        // Manually follow cross-protocol redirects (HttpURLConnection won't
        // follow http↔https automatically). /pos-apk 302s to signed storage.
        var hops = 0
        while (hops < 5) {
            val code = conn.responseCode
            if (code in 300..399) {
                val loc = conn.getHeaderField("Location") ?: break
                conn.disconnect()
                conn = URL(URL(urlStr), loc).openConnection() as HttpURLConnection
                conn.instanceFollowRedirects = true
                conn.connectTimeout = 30_000
                conn.readTimeout = 120_000
                hops++
                continue
            }
            if (code !in 200..299) {
                throw RuntimeException("HTTP $code from $urlStr")
            }
            break
        }

        conn.inputStream.use { input ->
            FileOutputStream(out).use { output ->
                input.copyTo(output, bufferSize = 64 * 1024)
            }
        }
        conn.disconnect()
        return out
    }

    private fun launchInstaller(apk: File, call: PluginCall) {
        try {
            val uri: Uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                apk,
            )
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            val res = JSObject()
            res.put("launched", true)
            res.put("bytes", apk.length())
            call.resolve(res)
        } catch (e: Throwable) {
            call.reject("Installer launch failed: ${e.message ?: e.javaClass.simpleName}")
        }
    }
}
