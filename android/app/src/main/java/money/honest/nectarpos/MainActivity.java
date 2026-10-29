package money.honest.nectarpos;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.nfc.NfcAdapter;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.PermissionRequest;
import android.webkit.WebView;


import androidx.core.app.ActivityCompat;

import com.getcapacitor.BridgeActivity;


/**
 * Hosts the Capacitor bridge plus NFC reader mode.
 *
 * Reader mode (not foreground dispatch) keeps the terminal listening for
 * tags continuously: some Senraise firmwares route NFC intents to whichever
 * activity is on top and stop re-arming foreground dispatch after the first
 * tag, which produced "tap works once, then the terminal goes deaf".
 * Reader mode delivers every tag straight to our callback instead.
 */
public class MainActivity extends BridgeActivity {

    private NfcAdapter nfcAdapter;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NectarPrinterPlugin.class);
        registerPlugin(NectarNfcPlugin.class);
        registerPlugin(TangemPaymentPlugin.class);
        registerPlugin(NectarUpdaterPlugin.class);
        registerPlugin(NectarDevicePlugin.class);
        super.onCreate(savedInstanceState);

        installCameraPermissionBridge();
        ensureCameraPermission();

        nfcAdapter = NfcAdapter.getDefaultAdapter(this);
    }

    /**
     * Kiosk-style full screen: hide Android's back/home/recents bar and the
     * status bar. A swipe from the screen edge reveals them temporarily.
     */
    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.navigationBars() | WindowInsets.Type.statusBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemBars();
        if (nfcAdapter != null) {
            nfcAdapter.enableReaderMode(
                this,
                tag -> NectarNfcPlugin.handleTag(tag),
                NfcAdapter.FLAG_READER_NFC_A
                    | NfcAdapter.FLAG_READER_NFC_B
                    | NfcAdapter.FLAG_READER_NFC_F
                    | NfcAdapter.FLAG_READER_NFC_V,
                null);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (nfcAdapter != null) {
            nfcAdapter.disableReaderMode(this);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Cold-start launches from the manifest's NDEF filter still arrive
        // as intents; reader mode covers everything while we are foregrounded.
        String action = intent.getAction();
        if (action != null && (
            action.equals(NfcAdapter.ACTION_NDEF_DISCOVERED) ||
            action.equals(NfcAdapter.ACTION_TECH_DISCOVERED) ||
            action.equals(NfcAdapter.ACTION_TAG_DISCOVERED))) {
            NectarNfcPlugin.handleTagIntent(intent);
        }
    }

    /**
     * Auto-grant camera (and mic) to the trusted web origin. Without this,
     * WebView denies getUserMedia() by default and the browser surfaces
     * "Permission denied" even though Android itself has camera permission.
     */
    private void installCameraPermissionBridge() {
        final WebView webView = getBridge().getWebView();
        if (webView == null) return;
        webView.setWebChromeClient(new com.getcapacitor.BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    String origin = request.getOrigin() != null ? request.getOrigin().toString() : "";
                    // Only grant to our own origins.
                    if (origin.startsWith("https://app.nectar-pay.com")
                        || origin.startsWith("https://nectar-pay.com")
                        || origin.startsWith("https://nectarpay.lovable.app")
                        || origin.startsWith("https://nectarpay.honest.money")) {
                        request.grant(request.getResources());
                    } else {
                        request.deny();
                    }
                });
            }
        });
    }

    /**
     * Request Android runtime camera permission at boot. WebView's
     * onPermissionRequest.grant() only works if the app itself already
     * holds CAMERA — otherwise the underlying getUserMedia still fails.
     */
    private void ensureCameraPermission() {
        if (Build.VERSION.SDK_INT < 23) return;
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                new String[] { Manifest.permission.CAMERA }, 0xC0DE);
        }
    }
}
