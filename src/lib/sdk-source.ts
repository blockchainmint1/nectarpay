// payHME vanilla JS SDK source. Served as application/javascript at /sdk/payhme.js.
// Kept as a single string so the route handler can ship it without a static-asset pipeline.

export const PAYHME_SDK_SOURCE = `/*! payhme.js v0.1 — non-custodial crypto checkout button
 * https://pay.honest.money  ·  MIT
 */
(function (global) {
  "use strict";
  if (global.PayHME) return; // idempotent

  var ORIGIN = (function () {
    try {
      var s = document.currentScript;
      if (s && s.src) return new URL(s.src).origin;
    } catch (e) {}
    return "https://pay.honest.money";
  })();

  var CSS = [
    ".phm-btn{display:inline-flex;align-items:center;gap:.5rem;padding:.65rem 1.1rem;",
    "font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;",
    "background:#0b0b0c;color:#fff;border:1px solid #1f1f22;border-radius:.6rem;",
    "cursor:pointer;transition:transform .08s,background .15s}",
    ".phm-btn:hover{background:#17171a}.phm-btn:active{transform:translateY(1px)}",
    ".phm-btn[disabled]{opacity:.6;cursor:not-allowed}",
    ".phm-btn .phm-dot{width:8px;height:8px;border-radius:2px;background:#22c55e;",
    "box-shadow:0 0 8px rgba(34,197,94,.7)}",
    ".phm-modal{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);",
    "display:flex;align-items:center;justify-content:center;z-index:2147483647}",
    ".phm-card{width:min(440px,92vw);height:min(720px,90vh);background:#fff;border-radius:14px;",
    "overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.5)}",
    ".phm-card iframe{width:100%;height:100%;border:0;display:block}",
    ".phm-x{position:absolute;top:8px;right:10px;background:rgba(0,0,0,.5);color:#fff;",
    "border:0;border-radius:999px;width:30px;height:30px;font:600 16px/1 sans-serif;",
    "cursor:pointer;z-index:2}"
  ].join("");

  function injectCss() {
    if (document.getElementById("phm-css")) return;
    var s = document.createElement("style");
    s.id = "phm-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function createInvoice(opts) {
    if (opts.invoiceId) return Promise.resolve({ id: opts.invoiceId, url: ORIGIN + "/i/" + opts.invoiceId });
    if (!opts.apiKey) return Promise.reject(new Error("payHME: apiKey required"));
    return fetch(ORIGIN + "/api/public/v1/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + opts.apiKey },
      body: JSON.stringify({
        chain: opts.chain,
        amount: Number(opts.amount),
        currency: opts.currency || "USD",
        order_id: opts.orderId || null,
        description: opts.description || null,
        redirect_url: opts.redirectUrl || null,
        buyer_email: opts.buyerEmail || null
      })
    }).then(function (r) {
      return r.json().then(function (body) {
        if (!r.ok) throw new Error(body && body.error ? body.error : "payHME: invoice create failed (" + r.status + ")");
        return { id: body.id, url: body.checkout_url || (ORIGIN + "/i/" + body.id) };
      });
    });
  }

  function openModal(url, handlers) {
    injectCss();
    var modal = document.createElement("div");
    modal.className = "phm-modal";
    modal.innerHTML = '<div class="phm-card"><button class="phm-x" aria-label="Close">&times;</button><iframe src="' + url + '" allow="clipboard-write"></iframe></div>';
    document.body.appendChild(modal);

    function close(reason) {
      window.removeEventListener("message", onMsg);
      modal.remove();
      if (handlers.onClose) handlers.onClose(reason);
    }
    function onMsg(e) {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.source !== "payhme") return;
      if (e.data.type === "paid" && handlers.onSuccess) handlers.onSuccess(e.data);
      if (e.data.type === "paid") close("paid");
      if (e.data.type === "expired" && handlers.onExpired) handlers.onExpired(e.data);
      if (e.data.type === "close") close("user");
    }
    window.addEventListener("message", onMsg);
    modal.querySelector(".phm-x").addEventListener("click", function () { close("user"); });
    modal.addEventListener("click", function (e) { if (e.target === modal) close("user"); });
  }

  function checkout(opts) {
    opts = opts || {};
    return createInvoice(opts).then(function (inv) {
      return new Promise(function (resolve, reject) {
        openModal(inv.url, {
          onSuccess: function (d) { resolve({ status: "paid", invoiceId: inv.id, tx: d.tx || null }); },
          onClose:   function (r) { if (r !== "paid") resolve({ status: "closed", invoiceId: inv.id }); },
          onExpired: function ()  { resolve({ status: "expired", invoiceId: inv.id }); }
        });
      });
    });
  }

  function readOpts(el) {
    var d = el.dataset;
    return {
      amount: d.amount, currency: d.currency, chain: d.chain,
      apiKey: d.apiKey, orderId: d.orderId, description: d.description,
      redirectUrl: d.redirectUrl, buyerEmail: d.buyerEmail,
      invoiceId: d.invoiceId
    };
  }

  function decorate(el) {
    if (el.__phm) return;
    el.__phm = true;
    el.classList.add("phm-btn");
    if (!el.innerHTML.trim()) {
      el.innerHTML = '<span class="phm-dot"></span> Pay with crypto';
    }
    el.addEventListener("click", function (e) {
      e.preventDefault();
      el.disabled = true;
      checkout(readOpts(el))
        .then(function (r) {
          el.dispatchEvent(new CustomEvent("payhme:result", { detail: r, bubbles: true }));
        })
        .catch(function (err) {
          el.dispatchEvent(new CustomEvent("payhme:error", { detail: err, bubbles: true }));
          console.error(err);
        })
        .finally(function () { el.disabled = false; });
    });
  }

  function scan(root) {
    (root || document).querySelectorAll("[data-payhme]").forEach(decorate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { injectCss(); scan(); });
  } else {
    injectCss(); scan();
  }

  global.PayHME = { checkout: checkout, scan: scan, origin: ORIGIN, version: "0.1" };
})(typeof window !== "undefined" ? window : globalThis);
`;
