import { supabase } from "@/integrations/supabase/client";

/** Ask the backend whether this email's provider is on the blocked list. Fails open; the backend still refuses. */
export async function signupEmailBlocked(email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("email_domain_blocked", { _email: email });
  if (error) return false;
  return data === true;
}
