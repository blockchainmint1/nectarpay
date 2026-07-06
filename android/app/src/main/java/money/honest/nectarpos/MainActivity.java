package money.honest.nectarpos;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Bitmap;
import android.net.http.SslError;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.os.Build;
import android.os.Bundle;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

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
        super.onCreate(savedInstanceState);

        installDebugWebViewClient();
        DebugOverlay.show(this,
            "Boot: loading " + getBridge().getServerUrl()
                + "\nAndroid " + Build.VERSION.RELEASE
                + " · SDK " + Build.VERSION.SDK_INT);

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
}
