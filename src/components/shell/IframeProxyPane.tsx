import { useEffect, useState } from "react";
import { getIframeUrl } from "@/lib/api/client";
import { useSession } from "@/lib/session";
import type { ModuleSummary } from "@/lib/api/types";

/**
 * contracts/ui-integration.md's `iframe-proxy` mode: the module's own web UI, embedded
 * via a short-lived token-bearing URL core mints, inside the same persistent chrome a
 * native page gets. The nav rail around this iframe never re-renders (ADR 0005) — only
 * this pane's contents change on navigation.
 */
export function IframeProxyPane({ module }: { module: ModuleSummary }) {
  const { activeWorkspace } = useSession();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    getIframeUrl(module.id, activeWorkspace?.workspace)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [module.id, activeWorkspace?.workspace]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-[13.5px] text-danger">
        Couldn't load {module.displayName}: {error}
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex h-full items-center justify-center text-[13.5px] text-text-muted">
        Loading {module.displayName}…
      </div>
    );
  }

  return (
    <iframe
      key={url}
      src={url}
      title={module.displayName}
      className="h-full w-full border-0"
      // Known failure mode carried over from OpenDataPlatform (ARCHITECTURE.md §6): a
      // third-party UI issuing absolute/root-relative follow-up calls escapes a naive
      // path-prefix proxy. That's a gateway-side fix, not something this sandbox
      // attribute can compensate for — kept permissive enough for real third-party
      // apps (Superset, JupyterHub) to function.
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
    />
  );
}
