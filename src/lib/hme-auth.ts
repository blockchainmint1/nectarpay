import { supabase } from "@/integrations/supabase/client";
import { HME_POPUP_TIMEOUT_MS, hmeChannelName, hmeTicketMessage } from "./hme-popup";

export async function finishHmeSso(token: string): Promise<{ is_admin: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/public/auth/hme-sso", {
    method: "POST",
    headers: { "content-type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
    body: JSON.stringify({ token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Sign-in failed");
  const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: data.token_hash });
  if (error) throw error;
  return { is_admin: Boolean(data.is_admin) };
}

export function openHmeConnection(onSuccess: (result: { is_admin: boolean }) => void, onError: (message: string) => void) {
  const flow = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
  const returnTo = `${window.location.origin}/sso?flow=${flow}`;
  const channel = typeof BroadcastChannel === "undefined" ? undefined : new BroadcastChannel(hmeChannelName(flow));
  let accepted = false;
  let popup: Window | null = null;
  const cleanup = () => {
    window.removeEventListener("message", onMessage);
    window.clearTimeout(timer);
    channel?.close();
  };
  const receive = async (data: unknown, acknowledge: () => void) => {
    if (accepted || !hmeTicketMessage(data, flow)) return;
    accepted = true;
    acknowledge();
    cleanup();
    try { onSuccess(await finishHmeSso(data.token)); }
    catch (error) { onError(error instanceof Error ? error.message : "Could not connect Honest Money"); }
  };
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== popup) return;
    void receive(event.data, () => popup?.postMessage({ type: "hme-sso-ack", flow }, window.location.origin));
  };
  if (channel) channel.onmessage = event => void receive(event.data, () => channel.postMessage({ type: "hme-sso-ack", flow }));
  window.addEventListener("message", onMessage);
  const timer = window.setTimeout(() => {
    cleanup();
    onError("Honest Money sign-in timed out. Please try again.");
  }, HME_POPUP_TIMEOUT_MS);
  popup = window.open(`https://honest.money/sso-login?popup=1&return_to=${encodeURIComponent(returnTo)}`, "hme-sso", "width=460,height=640");
  if (!popup) {
    cleanup();
    onError("Allow popups to sign in with Honest Money.");
  }
  return cleanup;
}