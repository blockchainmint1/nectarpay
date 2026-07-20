import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash } from "crypto";

export const getLatestPosRelease = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const sb = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await sb
    .from("pos_releases")
    .select("version, apk_path, sha256, notes, published_at")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { version: null, url: null, publishedAt: null, sha256: null, notes: null };
  return {
    version: data.version,
    url: "/pos-apk",
    publishedAt: data.published_at,
    sha256: data.sha256,
    notes: data.notes,
  };
});

const VERSION_RE = /nectar-pos-(\d+\.\d+\.\d+)\.apk$/i;

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden: admin only");
}

export const listPosReleases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("pos_releases")
      .select("id, version, apk_path, sha256, notes, published_at")
      .order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const uploadPosRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    const filename = String(data.get("filename") ?? "");
    const notes = String(data.get("notes") ?? "");
    if (!(file instanceof File)) throw new Error("Missing file");
    if (!VERSION_RE.test(filename)) {
      throw new Error(
        "Filename must match nectar-pos-X.Y.Z.apk (e.g. nectar-pos-0.1.6.apk)",
      );
    }
    return { file, filename, notes };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const version = data.filename.match(VERSION_RE)![1];
    const objectPath = `nectar-pos-${version}.apk`;
    const apkPath = `pos-releases/${objectPath}`;

    const buf = Buffer.from(await data.file.arrayBuffer());
    const sha256 = createHash("sha256").update(buf).digest("hex");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check version doesn't already exist
    const { data: existing } = await supabaseAdmin
      .from("pos_releases")
      .select("id")
      .eq("version", version)
      .maybeSingle();
    if (existing) {
      throw new Error(
        `Version ${version} already exists. Delete it first or bump the version number.`,
      );
    }

    const { error: upErr } = await supabaseAdmin.storage
      .from("pos-releases")
      .upload(objectPath, buf, {
        contentType: "application/vnd.android.package-archive",
        upsert: true,
      });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const { data: row, error: insErr } = await supabaseAdmin
      .from("pos_releases")
      .insert({
        version,
        apk_path: apkPath,
        sha256,
        notes: data.notes || null,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    return { ok: true, version, sha256, size: buf.length, id: row.id };
  });

export const deletePosRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rel } = await supabaseAdmin
      .from("pos_releases")
      .select("apk_path")
      .eq("id", data.id)
      .maybeSingle();
    if (rel?.apk_path) {
      const [, ...rest] = rel.apk_path.split("/");
      await supabaseAdmin.storage.from("pos-releases").remove([rest.join("/")]);
    }
    const { error } = await supabaseAdmin
      .from("pos_releases")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
