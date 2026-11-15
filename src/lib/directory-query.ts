import { queryOptions } from "@tanstack/react-query";
import { getPublicDirectory } from "@/lib/directory.functions";

export const directoryQuery = () =>
  queryOptions({ queryKey: ["public-directory"], queryFn: () => getPublicDirectory(), staleTime: 60_000 });
