import { registerPlugin } from "@capacitor/core";
import type { TangemPlugin } from "./definitions";

export const Tangem = registerPlugin<TangemPlugin>("Tangem", {
  web: () => import("./web").then((m) => new m.TangemWeb()),
});

export * from "./definitions";
