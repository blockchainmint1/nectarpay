package money.honest.nectarpos;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Turns the raw NDEF records from a scanned tag into a normalized payment
 * intent for the web app.
 *
 * Router priority (first match wins):
 *   1. application/vnd.nectar.pay+json   → our own encoded cards (highest trust)
 *   2. nectar:// URI                     → pre-signed pay intent
 *   3. bitcoin: / ethereum: / solana: / tron: URI  → BIP-21 / EIP-681 / Solana Pay
 *   4. Plaintext hex/base58 that looks like a chain address
 *   5. Bare URL                          → surface for in-app browser
 *
 * Anything that fails all five checks returns { format: "unknown" } and the
 * web app shows the raw records for debugging.
 */
final class NdefRouter {

    private static final Pattern EVM = Pattern.compile("^0x[a-fA-F0-9]{40}$");
    private static final Pattern BTC_LEGACY = Pattern.compile("^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$");
    private static final Pattern BTC_BECH32 = Pattern.compile("^bc1[a-z0-9]{20,80}$");
    private static final Pattern SOL = Pattern.compile("^[1-9A-HJ-NP-Za-km-z]{32,44}$");
    private static final Pattern TRON = Pattern.compile("^T[a-km-zA-HJ-NP-Z1-9]{33}$");

    private NdefRouter() {}

    static JSONObject route(JSONArray records) {
        JSONObject out = new JSONObject();
        try {
            // Pass 1 — NectarPay JSON record.
            for (int i = 0; i < records.length(); i++) {
                JSONObject r = records.getJSONObject(i);
                String type = r.optString("type", "");
                if ("application/vnd.nectar.pay+json".equalsIgnoreCase(type)) {
                    JSONObject body = new JSONObject(r.optString("mime", "{}"));
                    out.put("format", "nectar-json");
                    out.put("version", body.optInt("v", 1));
                    out.put("address", body.optString("addr"));
                    out.put("chain", body.optString("chain"));
                    if (body.has("token")) out.put("token", body.optString("token"));
                    if (body.has("amount")) out.put("amount", body.optDouble("amount"));
                    if (body.has("label")) out.put("label", body.optString("label"));
                    return out;
                }
            }

            // Pass 2 — URI-based records.
            for (int i = 0; i < records.length(); i++) {
                JSONObject r = records.getJSONObject(i);
                String uri = r.optString("uri", "");
                if (uri.isEmpty()) continue;

                if (uri.startsWith("nectar://")) {
                    out.put("format", "nectar-uri");
                    out.put("uri", uri);
                    return out;
                }
                if (uri.startsWith("bitcoin:")) return payScheme(out, "btc", uri, "bitcoin:");
                if (uri.startsWith("ethereum:")) return eip681(out, uri);
                if (uri.startsWith("solana:")) return payScheme(out, "sol", uri, "solana:");
                if (uri.startsWith("tron:")) return payScheme(out, "tron", uri, "tron:");
                if (uri.startsWith("http://") || uri.startsWith("https://")) {
                    out.put("format", "url");
                    out.put("uri", uri);
                    return out;
                }
            }

            // Pass 3 — text/plain records containing a bare address.
            for (int i = 0; i < records.length(); i++) {
                JSONObject r = records.getJSONObject(i);
                String text = r.optString("text", "").trim();
                if (text.isEmpty()) continue;

                String chain = classifyAddress(text);
                if (chain != null) {
                    out.put("format", "address");
                    out.put("chain", chain);
                    out.put("address", text);
                    return out;
                }
            }

            out.put("format", "unknown");
        } catch (JSONException e) {
            try { out.put("format", "error"); out.put("error", e.getMessage()); }
            catch (JSONException ignored) {}
        }
        return out;
    }

    private static JSONObject payScheme(JSONObject out, String chain, String uri, String prefix)
            throws JSONException {
        String rest = uri.substring(prefix.length());
        int q = rest.indexOf('?');
        String addr = q >= 0 ? rest.substring(0, q) : rest;
        String query = q >= 0 ? rest.substring(q + 1) : "";
        out.put("format", "pay-uri");
        out.put("chain", chain);
        out.put("address", addr);
        out.put("uri", uri);
        // Pull `amount=` if present (BIP-21 / Solana Pay).
        for (String kv : query.split("&")) {
            String[] pair = kv.split("=", 2);
            if (pair.length == 2 && pair[0].equalsIgnoreCase("amount")) {
                try { out.put("amount", Double.parseDouble(pair[1])); }
                catch (NumberFormatException ignored) {}
            }
            if (pair.length == 2 && pair[0].equalsIgnoreCase("spl-token")) {
                out.put("token", pair[1]);
            }
            if (pair.length == 2 && pair[0].equalsIgnoreCase("label")) {
                out.put("label", pair[1]);
            }
        }
        return out;
    }

    private static JSONObject eip681(JSONObject out, String uri) throws JSONException {
        // ethereum:0xAddr@chainId/transfer?address=0xTo&uint256=amount   (token)
        // ethereum:0xAddr@chainId?value=...                              (native)
        String body = uri.substring("ethereum:".length());
        int at = body.indexOf('@');
        int slash = body.indexOf('/');
        int q = body.indexOf('?');
        String target = body.substring(0, firstNonNeg(at, slash, q, body.length()));
        String chainSuffix = "";
        if (at >= 0) {
            int end = firstNonNeg(slash, q, body.length());
            chainSuffix = body.substring(at + 1, end);
        }
        String query = q >= 0 ? body.substring(q + 1) : "";
        boolean isTransfer = slash >= 0 && body.substring(slash).startsWith("/transfer");

        out.put("format", "pay-uri");
        out.put("chain", "eth");
        out.put("uri", uri);
        if (!chainSuffix.isEmpty()) out.put("chainId", chainSuffix);

        if (isTransfer) {
            out.put("token", target);
            for (String kv : query.split("&")) {
                String[] pair = kv.split("=", 2);
                if (pair.length < 2) continue;
                if (pair[0].equalsIgnoreCase("address")) out.put("address", pair[1]);
                if (pair[0].equalsIgnoreCase("uint256")) {
                    try { out.put("amount", Double.parseDouble(pair[1])); }
                    catch (NumberFormatException ignored) {}
                }
            }
        } else {
            out.put("address", target);
            for (String kv : query.split("&")) {
                String[] pair = kv.split("=", 2);
                if (pair.length < 2) continue;
                if (pair[0].equalsIgnoreCase("value")) {
                    try { out.put("amount", Double.parseDouble(pair[1])); }
                    catch (NumberFormatException ignored) {}
                }
            }
        }
        return out;
    }

    private static int firstNonNeg(int... xs) {
        int min = Integer.MAX_VALUE;
        for (int x : xs) if (x >= 0 && x < min) min = x;
        return min;
    }

    private static String classifyAddress(String s) {
        Matcher m;
        m = EVM.matcher(s);            if (m.matches()) return "eth";
        m = BTC_BECH32.matcher(s);     if (m.matches()) return "btc";
        m = BTC_LEGACY.matcher(s);     if (m.matches()) return "btc";
        m = TRON.matcher(s);           if (m.matches()) return "tron";
        m = SOL.matcher(s);            if (m.matches()) return "sol";
        return null;
    }
}
