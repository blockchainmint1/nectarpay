package money.honest.nectarpos;

import android.app.Activity;
import android.graphics.Color;
import android.util.Log;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Floating on-screen debug panel for WebView load failures.
 *
 * The POS runs against a remote server.url, so when the WebView can't reach
 * the host the user only sees Android's blank error page and we have no adb
 * on the terminal. This overlay pins the raw error (code, description, URL)
 * to the top of the screen so the operator can read + photograph it.
 */
public final class DebugOverlay {
    private static final String TAG = "NectarDebugOverlay";
    private static TextView view;

    private DebugOverlay() {}

    public static void show(final Activity activity, final String message) {
        Log.d(TAG, message);
        activity.runOnUiThread(new Runnable() {
            @Override public void run() {
                try {
                    if (view == null) {
                        view = new TextView(activity);
                        view.setBackgroundColor(0xCC000000);
                        view.setTextColor(Color.WHITE);
                        view.setTextSize(12f);
                        view.setPadding(24, 48, 24, 24);
                        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.WRAP_CONTENT,
                            Gravity.TOP);
                        ViewGroup root = (ViewGroup) activity.getWindow().getDecorView();
                        root.addView(view, lp);
                    }
                    view.setText("[NectarPay debug]\n" + message);
                    Toast.makeText(activity, message, Toast.LENGTH_LONG).show();
                } catch (Throwable t) {
                    Log.e(TAG, "overlay failed", t);
                }
            }
        });
    }
}
