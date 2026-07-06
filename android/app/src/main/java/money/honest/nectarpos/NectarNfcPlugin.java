package money.honest.nectarpos;

import android.content.Intent;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.os.Parcelable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;

/**
 * Bridges the terminal's NFC reader to the web app.
 *
 * The web app calls `NectarNfc.startReader()` when the "Tap to pay" screen
 * opens; the plugin registers itself as the current listener. When
 * MainActivity's foreground dispatch receives a tag it calls
 * `handleTagIntent(...)` which parses the NDEF and emits a `tagScanned`
 * event with the routed payload.
 */
@CapacitorPlugin(name = "NectarNfc")
public class NectarNfcPlugin extends Plugin {

    private static NectarNfcPlugin active;

    @Override
    public void load() {
        active = this;
    }

    @PluginMethod
    public void startReader(PluginCall call) {
        active = this;
        JSObject ret = new JSObject();
        ret.put("started", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopReader(PluginCall call) {
        // Foreground dispatch stays wired in MainActivity — we just stop
        // forwarding events to JS.
        call.resolve();
    }

    /** Called by MainActivity when a tag intent arrives while foregrounded. */
    static void handleTagIntent(Intent intent) {
        if (active == null) return;
        try {
            String action = intent.getAction();
            Parcelable[] rawMsgs = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);

            String uid = null;
            if (tag != null && tag.getId() != null) {
                uid = bytesToHex(tag.getId());
            }

            JSONArray records = new JSONArray();
            if (rawMsgs != null) {
                for (Parcelable p : rawMsgs) {
                    NdefMessage msg = (NdefMessage) p;
                    for (NdefRecord r : msg.getRecords()) {
                        records.put(recordToJson(r));
                    }
                }
            } else if (tag != null) {
                // Empty / non-NDEF tag; still surface UID so we can look it
                // up in a merchant-owned card registry if desired.
                Ndef ndef = Ndef.get(tag);
                if (ndef != null) {
                    NdefMessage cached = ndef.getCachedNdefMessage();
                    if (cached != null) {
                        for (NdefRecord r : cached.getRecords()) {
                            records.put(recordToJson(r));
                        }
                    }
                }
            }

            JSONObject parsed = NdefRouter.route(records);
            JSObject event = new JSObject();
            event.put("action", action);
            event.put("uid", uid);
            event.put("records", records);
            event.put("parsed", JSObject.fromJSONObject(parsed));
            active.notifyListeners("tagScanned", event);
        } catch (Throwable t) {
            JSObject err = new JSObject();
            err.put("error", t.getMessage());
            active.notifyListeners("tagError", err);
        }
    }

    private static JSONObject recordToJson(NdefRecord r) throws org.json.JSONException {
        JSONObject o = new JSONObject();
        short tnf = r.getTnf();
        byte[] type = r.getType();
        byte[] payload = r.getPayload();

        o.put("tnf", (int) tnf);
        o.put("type", type == null ? "" : new String(type, StandardCharsets.UTF_8));

        // Try URI record decode first.
        try {
            android.net.Uri uri = r.toUri();
            if (uri != null) {
                o.put("uri", uri.toString());
            }
        } catch (Throwable ignored) { }

        // Text record: [status][lang][text]
        if (tnf == NdefRecord.TNF_WELL_KNOWN
            && type != null && type.length == 1 && type[0] == 'T'
            && payload != null && payload.length > 0) {
            int status = payload[0] & 0xff;
            int langLen = status & 0x3f;
            if (payload.length > 1 + langLen) {
                String text = new String(payload, 1 + langLen,
                    payload.length - 1 - langLen, StandardCharsets.UTF_8);
                o.put("text", text);
            }
        }

        // Mime record (e.g. application/vnd.nectar.pay+json).
        if (tnf == NdefRecord.TNF_MIME_MEDIA && payload != null) {
            o.put("mime", new String(payload, StandardCharsets.UTF_8));
        }

        o.put("raw", bytesToHex(payload));
        return o;
    }

    private static String bytesToHex(byte[] bytes) {
        if (bytes == null) return "";
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            String h = Integer.toHexString(0xff & b);
            if (h.length() == 1) sb.append('0');
            sb.append(h);
        }
        return sb.toString();
    }
}
