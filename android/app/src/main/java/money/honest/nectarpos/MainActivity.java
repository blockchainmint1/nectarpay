package money.honest.nectarpos;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;


import androidx.core.app.ActivityCompat;

import com.getcapacitor.BridgeActivity;


/**
 * Hosts the Capacitor bridge plus NFC foreground dispatch.
 *
 * Some Senraise firmwares route NFC intents to whichever activity is on
 * top; foreground dispatch is the reliable way to ensure our activity
 * receives every tag scan while the POS is on screen.
 */
public class MainActivity extends BridgeActivity {

    private NfcAdapter nfcAdapter;
    private PendingIntent nfcPendingIntent;
    private IntentFilter[] nfcIntentFilters;
    private String[][] nfcTechLists;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NectarPrinterPlugin.class);
        registerPlugin(NectarNfcPlugin.class);
        registerPlugin(TangemPaymentPlugin.class);
        registerPlugin(NectarUpdaterPlugin.class);
        super.onCreate(savedInstanceState);

        installCameraPermissionBridge();
        ensureCameraPermission();


        nfcAdapter = NfcAdapter.getDefaultAdapter(this);
        if (nfcAdapter != null) {
            int flags = Build.VERSION.SDK_INT >= 31
                ? PendingIntent.FLAG_MUTABLE
                : 0;
            nfcPendingIntent = PendingIntent.getActivity(
                this, 0,
                new Intent(this, getClass()).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                flags);

            IntentFilter ndef = new IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED);
            IntentFilter tech = new IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED);
            IntentFilter tag  = new IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED);
            nfcIntentFilters = new IntentFilter[] { ndef, tech, tag };
            nfcTechLists = new String[][] {
                new String[] { android.nfc.tech.Ndef.class.getName() },
                new String[] { android.nfc.tech.NdefFormatable.class.getName() },
                new String[] { android.nfc.tech.MifareClassic.class.getName() },
                new String[] { android.nfc.tech.MifareUltralight.class.getName() },
                new String[] { android.nfc.tech.IsoDep.class.getName() },
            };
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (nfcAdapter != null) {
            nfcAdapter.enableForegroundDispatch(this, nfcPendingIntent,
                nfcIntentFilters, nfcTechLists);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (nfcAdapter != null) {
            nfcAdapter.disableForegroundDispatch(this);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
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
                    if (origin.startsWith("https://nectar-pay.com")
                        || origin.startsWith("https://nectarpay.lovable.app")
                        || origin.startsWith("https://nectarpay.honest.money")
                        || origin.startsWith("https://nector-pay.com")) {
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
