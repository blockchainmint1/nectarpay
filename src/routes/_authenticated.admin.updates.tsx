import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Trash2, CheckCircle2 } from "lucide-react";
import {
  listPosReleases,
  uploadPosRelease,
  deletePosRelease,
} from "@/lib/pos-releases.functions";

export const Route = createFileRoute("/_authenticated/admin/updates")({
  component: AdminUpdates,
});

function AdminUpdates() {
  const list = useServerFn(listPosReleases);
  const upload = useServerFn(uploadPosRelease);
  const del = useServerFn(deletePosRelease);
  const qc = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [filename, setFilename] = useState("");
  const [notes, setNotes] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: releases = [], isLoading } = useQuery({
    queryKey: ["pos-releases"],
    queryFn: () => list(),
  });

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Pick an APK file first");
      const name = filename.trim() || file.name;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("filename", name);
      fd.append("notes", notes);
      return upload({ data: fd });
    },
    onSuccess: (r) => {
      toast.success(`Published v${r.version} (${(r.size / 1_000_000).toFixed(1)} MB)`);
      setFile(null);
      setFilename("");
      setNotes("");
      if (inputRef.current) inputRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["pos-releases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Release deleted");
      qc.invalidateQueries({ queryKey: ["pos-releases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">POS Updates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a signed APK. Terminals in the field auto-detect the new version
          within ~4 hours (or on next app resume) and prompt users to install.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card/40 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Publish new release
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
              APK file
            </label>
            <input
              ref={inputRef}
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !filename) setFilename(f.name);
              }}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
              Filename (must match nectar-pos-X.Y.Z.apk)
            </label>
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="nectar-pos-0.1.6.apk"
              className="font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Version is auto-extracted from the filename. Rename here if your
              build tool named it something else.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
              Release notes (optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What changed in this build…"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {file
                ? `${file.name} · ${(file.size / 1_000_000).toFixed(1)} MB`
                : "No file selected"}
            </p>
            <Button
              onClick={() => uploadMut.mutate()}
              disabled={!file || uploadMut.isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadMut.isPending ? "Uploading…" : "Publish release"}
            </Button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Published releases
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Version</th>
                <th className="px-4 py-2">Published</th>
                <th className="px-4 py-2">SHA-256</th>
                <th className="px-4 py-2">Notes</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {releases.map((r, idx) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="px-4 py-2 font-mono">
                    {idx === 0 && (
                      <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-primary" />
                    )}
                    {r.version}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(r.published_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {r.sha256.slice(0, 12)}…
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground max-w-xs truncate">
                    {r.notes || "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete v${r.version}? This can't be undone.`)) {
                          deleteMut.mutate(r.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!isLoading && releases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No releases yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
