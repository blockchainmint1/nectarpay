package money.honest.nectarpos;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.IBinder;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.getcapacitor.JSArray;
import org.json.JSONObject;

import recieptservice.com.recieptservice.PrinterInterface;

/**
 * Native bridge over the Senraise printer.
 *
 * The Senraise firmware exposes an AIDL service
 * (`recieptservice.com.recieptservice/.service.PrinterService`) that
 * implements {@link PrinterInterface}. We bind to it lazily on the first
 * call and reuse the connection for the life of the process.
 *
 * Receipt payload from the web app:
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

    private static final String PKG = "recieptservice.com.recieptservice";
    private static final String CLS = "recieptservice.com.recieptservice.service.PrinterService";

    private PrinterInterface printer;

    private final ServiceConnection conn = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            printer = PrinterInterface.Stub.asInterface(service);
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            printer = null;
        }
    };

    private synchronized PrinterInterface bind() {
        if (printer != null) return printer;
        Context ctx = getContext();
        Intent intent = new Intent();
        intent.setClassName(PKG, CLS);
        try { ctx.startService(intent); } catch (Throwable ignored) {}
        ctx.bindService(intent, conn, Context.BIND_AUTO_CREATE);
        // Give the bind a brief moment. Real Senraise firmware binds
        // essentially instantly; a short spin avoids a false negative on
        // the very first call after boot.
        for (int i = 0; i < 40 && printer == null; i++) {
            try { Thread.sleep(50); } catch (InterruptedException ignored) {}
        }
        return printer;
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", bind() != null);
        call.resolve(ret);
    }

    @PluginMethod
    public void printText(PluginCall call) {
        String text = call.getString("text", "");
        try {
            PrinterInterface p = require();
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
            PrinterInterface p = require();

            String header = call.getString("header");
            String footer = call.getString("footer");
            String qr = call.getString("qr");
            JSONArray lines = call.getArray("lines", new JSONArray());

            if (header != null) {
                p.setAlignment(1);
                p.setTextSize(30f);
                p.setTextBold(true);
                p.printText(header);
                p.nextLine(1);
                p.setTextBold(false);
                p.setTextSize(24f);
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
                p.setTextSize(24f);
            }

            if (qr != null && qr.length() > 0) {
                p.nextLine(1);
                p.setAlignment(1);
                p.printQRCode(qr, 6, 3);
                p.nextLine(1);
            }

            if (footer != null && footer.length() > 0) {
                p.setAlignment(1);
                p.setTextSize(22f);
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
            PrinterInterface p = require();
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
            require().nextLine(lines);
            call.resolve();
        } catch (Throwable t) {
            call.reject("feed failed: " + t.getMessage(), t);
        }
    }

    private PrinterInterface require() {
        PrinterInterface p = bind();
        if (p == null) {
            throw new IllegalStateException(
                "Senraise printer service not available on this device");
        }
        return p;
    }
}
