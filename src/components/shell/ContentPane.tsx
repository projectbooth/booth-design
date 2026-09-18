import type { ModuleSummary } from "@/lib/api/types";
import { IframeProxyPane } from "./IframeProxyPane";
import { NativeModulePane } from "./NativeModulePane";

/**
 * Picks native vs. iframe-proxy per contracts/ui-integration.md / ADR 0005, driven by
 * `GET /api/modules`'s `uiIntegrationMode` field. Defaults to `native` only as a
 * defensive fallback for the case contracts/module-manifest.md itself allows —
 * `hasOwnUi: false` modules never reach this component in practice (ContentPane is
 * only ever rendered for a module `findModuleForPath` matched by `navPath`, which
 * `hasOwnUi: false` modules don't have — src/pages/ModuleRoutePage.tsx).
 */
export function ContentPane({ module }: { module: ModuleSummary }) {
  const mode = module.uiIntegrationMode ?? "native";

  if (mode === "iframe-proxy") {
    return <IframeProxyPane module={module} />;
  }
  return <NativeModulePane module={module} />;
}
