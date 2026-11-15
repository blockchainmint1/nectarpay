// Server-only counters for public (no sign-in) tools that spend third-party
// credits. The visitor's address is stored only as a salted one-way hash.
import { createHash } from "crypto";

export async function bumpPublicRate(bucket: string, subject: string, windowSeconds: number): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = createHash("sha256").update(`nectarpay-rate:${bucket}:${subject}`).digest("hex");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin.rpc as any)("bump_public_rate", {
    _bucket: bucket,
    _subject_hash: hash,
    _window_seconds: windowSeconds,
  });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : 0;
}
