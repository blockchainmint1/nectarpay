// Client-side file delivery for anything the visitor downloads from the app.
// The click handler must call deliverFile synchronously: browsers drop user
// activation after an await, and iOS Safari drops it fastest. So the bytes are
// prepared earlier (when the item loads) and the button only hands them over.

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Shares on touch devices (so iOS offers "Save to Files"), otherwise downloads. */
export async function deliverFile(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  const touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
    }
  }
  downloadBlob(blob, filename);
}

/** data URL -> Blob, done ahead of the click so the click stays synchronous. */
export async function blobFromDataUrl(dataUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}
