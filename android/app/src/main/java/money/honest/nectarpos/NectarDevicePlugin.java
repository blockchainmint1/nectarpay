package money.honest.nectarpos;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Exposes the terminal's hardware identity to the web app.
 *
 * Serial numbers on Android:
 *   • API < 26  → Build.SERIAL is readable by anyone.
 *   • API 26-28 → Build.getSerial() requires READ_PHONE_STATE (declared
 *     in the manifest; Senraise images usually grant it to system-signed
 *     or sideloaded POS apps, otherwise we fall back).
 *   • API 29+   → Build.getSerial() throws SecurityException for normal
 *     apps. Many POS vendors (Senraise included) still expose the printed
 *     serial through system properties such as `ro.serialno` /
 *     `gsm.sn1` / `persist.sys.serialno`, so we probe those reflectively.
 *
 * If everything fails we return the ANDROID_ID as a stable install-scoped
 * fallback so a terminal can still be uniquely assigned to a merchant.
 */
@CapacitorPlugin(name = "NectarDevice")
public class NectarDevicePlugin extends Plugin {

    @PluginMethod
    public void getInfo(PluginCall call) {
        JSObject out = new JSObject();

        String serial = readSerial();
        out.put("serial", serial);
        out.put("serialSource", serial == null ? null : lastSource);
        out.put("androidId", androidId());
        out.put("model", Build.MODEL);
        out.put("manufacturer", Build.MANUFACTURER);
        out.put("device", Build.DEVICE);
        out.put("androidVersion", Build.VERSION.RELEASE);
        out.put("sdkInt", Build.VERSION.SDK_INT);

        try {
            PackageManager pm = getContext().getPackageManager();
            PackageInfo pi = pm.getPackageInfo(getContext().getPackageName(), 0);
            out.put("appVersion", pi.versionName);
            long code = Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : (long) pi.versionCode;
            out.put("appBuild", String.valueOf(code));
        } catch (Exception e) {
            out.put("appVersion", null);
            out.put("appBuild", null);
        }

        call.resolve(out);
    }

    private String lastSource = null;

    private String readSerial() {
        // 1) Vendor system properties (works on most POS hardware, all API levels).
        String[] props = new String[] {
            "ro.serialno", "ro.boot.serialno", "persist.sys.serialno", "gsm.sn1", "ro.serial"
        };
        for (String p : props) {
            String v = systemProperty(p);
            if (isUsable(v)) { lastSource = "prop:" + p; return v.trim(); }
        }

        // 2) Framework APIs.
        try {
            String v = Build.VERSION.SDK_INT >= 26 ? Build.getSerial() : Build.SERIAL;
            if (isUsable(v)) { lastSource = "build"; return v.trim(); }
        } catch (Throwable ignored) {
            // SecurityException on API 29+ without privileged access.
        }

        lastSource = null;
        return null;
    }

    private static boolean isUsable(String v) {
        return v != null && v.trim().length() > 0 && !"unknown".equalsIgnoreCase(v.trim());
    }

    private static String systemProperty(String key) {
        try {
            Class<?> c = Class.forName("android.os.SystemProperties");
            return (String) c.getMethod("get", String.class).invoke(null, key);
        } catch (Throwable t) {
            return null;
        }
    }

    private String androidId() {
        try {
            return Settings.Secure.getString(getContext().getContentResolver(), Settings.Secure.ANDROID_ID);
        } catch (Throwable t) {
            return null;
        }
    }
}
