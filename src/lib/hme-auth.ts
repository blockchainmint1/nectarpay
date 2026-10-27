import { supabase } from "@/integrations/supabase/client";

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

export function openHmeConnection(onSuccess: () => void, onError: (message: string) => void) {
  const returnTo = `${window.location.origin}/sso`;
  const popup = window.open(`https://honest.money/sso-login?popup=1&return_to=${encodeURIComponent(returnTo)}`, "hme-sso", "width=460,height=640");
  if (!popup) { onError("Allow popups to connect Honest Money."); return; }
  const onMessage = async (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== popup || event.data?.type !== "hme-sso" || typeof event.data.token !== "string") return;
    window.removeEventListener("message", onMessage);
    clearTimeout(timer);
    try { await finishHmeSso(event.data.token); onSuccess(); }
    catch (error) { onError(error instanceof Error ? error.message : "Could not connect Honest Money"); }
  };
  const timer = window.setTimeout(() => window.removeEventListener("message", onMessage), 180000);
  window.addEventListener("message", onMessage);
}