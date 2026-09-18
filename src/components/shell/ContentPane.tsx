import type { ModuleSummary } from "@/lib/api/types";
import { IframeProxyPane } from "./IframeProxyPane";
import { NativeModulePane } from "./NativeModulePane";

/**
 * Picks native vs. iframe-proxy per contracts/ui-integration.md / ADR 0005. Defaults
 * to `native` when `uiIntegrationMode` is missing, because `GET /api/modules` doesn't
 * return that field yet (src/lib/api/types.ts's file-level note #2) — wrong for any
 * installed iframe-proxy module until core adds it, flagged rather than silently
 * papered over further.
 */
export function ContentPane({ module }: { module: ModuleSummary }) {
  const mode = module.uiIntegrationMode ?? "native";

  if (mode === "iframe-proxy") {
    return <IframeProxyPane module={module} />;
  }
  return <NativeModulePane module={module} />;
}
