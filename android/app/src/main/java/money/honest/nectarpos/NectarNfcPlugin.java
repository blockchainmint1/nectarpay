package money.honest.nectarpos;

import android.content.Intent;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.IsoDep;
import android.nfc.tech.Ndef;
import android.os.Handler;
import android.os.Looper;
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
 * MainActivity enables reader mode when the POS is foregrounded; every
 * discovered tag arrives via `handleTag(...)` and is emitted as a
 * `tagScanned` event with the routed payload. Cold-start NDEF intents
 * still arrive through `handleTagIntent(...)`.
 *
 * The last-seen Tag is cached so JS can call `transceive({ apduHex })` to
 * probe secure-element cards (Tangem, EMV, etc). Cached Tag handles are
 * only valid until the next tap or until Android reaps them (~seconds).
 */
@CapacitorPlugin(name = "NectarNfc")
public class NectarNfcPlugin extends Plugin {

    private static NectarNfcPlugin active;
    private static Tag lastTag;
    private static final Handler main = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        active = this;
    }

    @PluginMethod
    public void startReader(PluginCall call) {
        active = this;
        NfcAdapter adapter = NfcAdapter.getDefaultAdapter(getContext());
        if (adapter == null) {
            call.reject("This device has no NFC hardware.");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("NFC is turned off in Android settings — turn it on and tap again.");
            return;
        }
        // Re-arm reader mode: Tangem SDK sessions run their own reader mode
        // and disable ours when they finish, so every startReader call (the
        // web app makes one after each Tangem operation) restores continuous
        // listening without waiting for an activity pause/resume.
        android.app.Activity act = getActivity();
        if (act != null) {
            act.runOnUiThread(() -> adapter.enableReaderMode(act,
                tag -> NectarNfcPlugin.handleTag(tag),
                NfcAdapter.FLAG_READER_NFC_A | NfcAdapter.FLAG_READER_NFC_B
                    | NfcAdapter.FLAG_READER_NFC_F | NfcAdapter.FLAG_READER_NFC_V,
                null));
        }
        JSObject ret = new JSObject();
        ret.put("started", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopReader(PluginCall call) {
        call.resolve();
    }

    /**
     * Send a raw APDU (hex) to the last-scanned tag's IsoDep channel.
     * Returns { responseHex, sw1, sw2 } on success.
     */
    @PluginMethod
    public void transceive(PluginCall call) {
        String apduHex = call.getString("apduHex");
        if (apduHex == null || apduHex.isEmpty()) {
            call.reject("apduHex required");
            return;
        }
        Tag tag = lastTag;
        if (tag == null) {
            call.reject("no tag in scope — tap card first");
            return;
        }
        IsoDep iso = IsoDep.get(tag);
        if (iso == null) {
            call.reject("tag does not support IsoDep");
            return;
        }
        try {
            iso.connect();
            iso.setTimeout(3000);
            byte[] resp = iso.transceive(hexToBytes(apduHex));
            JSObject out = new JSObject();
            out.put("responseHex", bytesToHex(resp));
            if (resp.length >= 2) {
                out.put("sw1", String.format("%02x", resp[resp.length - 2] & 0xff));
                out.put("sw2", String.format("%02x", resp[resp.length - 1] & 0xff));
            }
            call.resolve(out);
        } catch (Throwable t) {
            call.reject("transceive failed: " + t.getMessage());
        } finally {
            try { iso.close(); } catch (Throwable ignored) {}
        }
    }

    /** Reader-mode callback from MainActivity; runs on a binder thread. */
    static void handleTag(Tag tag) {
        if (active == null || tag == null) return;
        JSONArray records = new JSONArray();
        Ndef ndef = Ndef.get(tag);
        if (ndef != null) {
            NdefMessage msg = ndef.getCachedNdefMessage();
            if (msg == null) {
                try {
                    ndef.connect();
                    msg = ndef.getNdefMessage();
                } catch (Throwable ignored) {
                } finally {
                    try { ndef.close(); } catch (Throwable ignored) {}
                }
            }
            if (msg != null) {
                for (NdefRecord r : msg.getRecords()) putRecord(records, r);
            }
        }
        emit(NfcAdapter.ACTION_TAG_DISCOVERED, tag, records);
    }

    /** Called by MainActivity when a cold-start tag intent arrives. */
    static void handleTagIntent(Intent intent) {
        if (active == null) return;
        Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
        JSONArray records = new JSONArray();
        Parcelable[] rawMsgs = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
        if (rawMsgs != null) {
            for (Parcelable p : rawMsgs) {
                NdefMessage msg = (NdefMessage) p;
                for (NdefRecord r : msg.getRecords()) putRecord(records, r);
            }
        } else if (tag != null) {
            Ndef ndef = Ndef.get(tag);
            if (ndef != null) {
                NdefMessage cached = ndef.getCachedNdefMessage();
                if (cached != null) {
                    for (NdefRecord r : cached.getRecords()) putRecord(records, r);
                }
            }
        }
        emit(intent.getAction(), tag, records);
    }

    /** Builds the tagScanned event and notifies JS on the main thread. */
    private static void emit(String action, Tag tag, JSONArray records) {
        lastTag = tag;
        try {
            String uid = null;
            JSONArray techList = new JSONArray();
            JSONObject isoInfo = null;

            if (tag != null) {
                if (tag.getId() != null) uid = bytesToHex(tag.getId());
                for (String t : tag.getTechList()) techList.put(t);

                IsoDep iso = IsoDep.get(tag);
                if (iso != null) {
                    isoInfo = new JSONObject();
                    byte[] ats = iso.getHistoricalBytes(); // Type A
                    byte[] hib = iso.getHiLayerResponse(); // Type B
                    isoInfo.put("historicalBytesHex", ats == null ? "" : bytesToHex(ats));
                    isoInfo.put("hiLayerResponseHex", hib == null ? "" : bytesToHex(hib));
                    isoInfo.put("maxTransceiveLength", iso.getMaxTransceiveLength());
                }
            }

            JSONObject parsed = NdefRouter.route(records);
            JSObject event = new JSObject();
            event.put("action", action);
            event.put("uid", uid);
            event.put("techList", techList);
            if (isoInfo != null) event.put("isoDep", JSObject.fromJSONObject(isoInfo));
            event.put("records", records);
            event.put("parsed", JSObject.fromJSONObject(parsed));
            main.post(() -> {
                NectarNfcPlugin a = active;
                if (a != null) a.notifyListeners("tagScanned", event);
            });
        } catch (Throwable t) {
            JSObject err = new JSObject();
            err.put("error", String.valueOf(t.getMessage()));
            main.post(() -> {
                NectarNfcPlugin a = active;
                if (a != null) a.notifyListeners("tagError", err);
            });
        }
    }

    private static void putRecord(JSONArray records, NdefRecord r) {
        try {
            records.put(recordToJson(r));
        } catch (Throwable ignored) {}
    }

    private static JSONObject recordToJson(NdefRecord r) throws org.json.JSONException {
        JSONObject o = new JSONObject();
        short tnf = r.getTnf();
        byte[] type = r.getType();
        byte[] payload = r.getPayload();

        o.put("tnf", (int) tnf);
        o.put("type", type == null ? "" : new String(type, StandardCharsets.UTF_8));

        try {
            android.net.Uri uri = r.toUri();
            if (uri != null) {
                o.put("uri", uri.toString());
            }
        } catch (Throwable ignored) { }

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

    private static byte[] hexToBytes(String hex) {
        String clean = hex.replaceAll("[^0-9a-fA-F]", "");
        int len = clean.length() / 2;
        byte[] out = new byte[len];
        for (int i = 0; i < len; i++) {
            out[i] = (byte) Integer.parseInt(clean.substring(i * 2, i * 2 + 2), 16);
        }
        return out;
    }
}
