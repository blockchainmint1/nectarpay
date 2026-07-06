package money.honest.nectarpos;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.sr.SrPrinter;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Native bridge over the Senraise printer.
 *
 * The Senraise firmware exposes a system service that `SrPrinter` (in
 * printer.jar) wraps. We accept a structured payload from the web app so
 * the receipt layout stays declarative:
 *
 *   NectarPrinter.printReceipt({
 *     header: "Joe's Coffee",
 *     lines: [
 *       { text: "Latte", right: "$4.50" },
 *       { text: "Muffin", right: "$3.00" },
 *       { divider: true },
 *       { text: "Total", right: "$7.50", bold: true, size: 32 }
 *     ],
 *     qr: "https://nectar-pay.com/i/abc123",
 *     footer: "Thanks — paid with USDC on Base"
 *   })
 */
@CapacitorPlugin(name = "NectarPrinter")
public class NectarPrinterPlugin extends Plugin {

    @PluginMethod
    public void isAvailable(PluginCall call) {
        boolean ok = false;
        try {
            SrPrinter.getInstance(getContext());
            ok = true;
        } catch (Throwable t) {
            ok = false;
        }
        JSObject ret = new JSObject();
        ret.put("available", ok);
        call.resolve(ret);
    }

    @PluginMethod
    public void printText(PluginCall call) {
        String text = call.getString("text", "");
        try {
            SrPrinter p = SrPrinter.getInstance(getContext());
            p.printText(text);
            p.nextLine(3);
            call.resolve();
        } catch (Throwable t) {
            call.reject("print failed: " + t.getMessage(), t);
        }
    }

    @PluginMethod
    public void printReceipt(PluginCall call) {
        try {
            SrPrinter p = SrPrinter.getInstance(getContext());

            String header = call.getString("header");
            String footer = call.getString("footer");
            String qr = call.getString("qr");
            JSONArray lines = call.getArray("lines", new JSONArray());

            if (header != null) {
                p.setAlignment(1);
                p.setTextSize(30);
                p.setTextBold(true);
                p.printText(header);
                p.nextLine(1);
                p.setTextBold(false);
                p.setTextSize(24);
            }

            p.setAlignment(0);
            for (int i = 0; i < lines.length(); i++) {
                JSONObject line = lines.getJSONObject(i);
                if (line.optBoolean("divider", false)) {
                    p.printText("--------------------------------");
                    continue;
                }
                boolean bold = line.optBoolean("bold", false);
                int size = line.optInt("size", 24);
                p.setTextBold(bold);
                p.setTextSize((float) size);
                String left = line.optString("text", "");
                String right = line.optString("right", "");
                if (right.length() > 0) {
                    p.printTableText(
                        new String[] { left, right },
                        new int[] { 3, 2 },
                        new int[] { 0, 2 });
                } else {
                    p.printText(left);
                }
                p.setTextBold(false);
                p.setTextSize(24);
            }

            if (qr != null && qr.length() > 0) {
                p.nextLine(1);
                p.setAlignment(1);
                p.printQRCode(qr, 6, 3);
                p.nextLine(1);
            }

            if (footer != null && footer.length() > 0) {
                p.setAlignment(1);
                p.setTextSize(22);
                p.printText(footer);
            }

            p.nextLine(4);
            call.resolve();
        } catch (Throwable t) {
            call.reject("printReceipt failed: " + t.getMessage(), t);
        }
    }

    @PluginMethod
    public void printBitmap(PluginCall call) {
        String base64 = call.getString("base64", "");
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            Bitmap bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            SrPrinter p = SrPrinter.getInstance(getContext());
            p.printBitmap(bmp);
            p.nextLine(3);
            call.resolve();
        } catch (Throwable t) {
            call.reject("printBitmap failed: " + t.getMessage(), t);
        }
    }

    @PluginMethod
    public void feed(PluginCall call) {
        int lines = call.getInt("lines", 3);
        try {
            SrPrinter.getInstance(getContext()).nextLine(lines);
            call.resolve();
        } catch (Throwable t) {
            call.reject("feed failed: " + t.getMessage(), t);
        }
    }
}
