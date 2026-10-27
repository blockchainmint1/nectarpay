import { createServerFn } from "@tanstack/react-start";

import type { DirectoryFeed } from "./directory.server";

export const getPublicDirectory = createServerFn({ method: "GET" }).handler(async (): Promise<DirectoryFeed> => {
  const { loadDirectory } = await import("./directory.server");
  return loadDirectory(null);
});
