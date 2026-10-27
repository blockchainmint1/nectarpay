import { createContext, useContext } from "react";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StoreRef = { storeId: string; storeSlug: string };

export const StoreRefContext = createContext<StoreRef | null>(null);

/** Resolved store for pages under /stores/[slug]. Always returns the real id for queries
 *  and the human slug for building links. */
export function useStoreRef(): StoreRef {
  const ctx = useContext(StoreRefContext);
  if (!ctx) throw new Error("useStoreRef must be used inside the store layout");
  return ctx;
}

/** Turn a store name into the same slug shape the database produces. */
export function slugifyStoreName(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");
  return s || "store";
}
