import { useEffect, useRef, useState } from "react";
import { getIframeUrl } from "@/lib/api/client";
import { useSession } from "@/lib/session";
import { useTheme, type Theme } from "@/lib/theme";
import type { ModuleSummary } from "@/lib/api/types";

/**
 * ADR 0069 item C: core's iframe session cookie is fixed at CookieTTL = 15 minutes
 * (booth-core's internal/gateway/iframeproxy.go) with no server-side renewal path — a
 * pane mounted once ran that fixed clock with nothing refreshing it, so every request
 * after 15 minutes (saves, kernel restarts, new websocket connections) 401'd at the
 * gateway. Comfortably under that TTL so a slow tick or a single missed renewal still
 * leaves margin before the cookie actually lapses. If core's CookieTTL ever changes,
 * this needs to change with it — there's no shared constant to import across repos.
 */
const RENEWAL_INTERVAL_MS = 10 * 60 * 1000;

interface IframeReadyMessage {
  type: "booth:iframe-ready";
}

interface ThemeMessage {
  type: "booth:theme";
  theme: Theme;
}

function isIframeReadyMessage(data: unknown): data is IframeReadyMessage {
  return typeof data === "object" && data !== null && (data as { type?: unknown }).type === "booth:iframe-ready";
}

/**
 * contracts/ui-integration.md's `iframe-proxy` mode: the module's own web UI, embedded
 * via a short-lived token-bearing URL core mints, inside the same persistent chrome a
 * native page gets. The nav rail around this iframe never re-renders (ADR 0005) — only
 * this pane's contents change on navigation.
 */
export function IframeProxyPane({ module }: { module: ModuleSummary }) {
  const { activeWorkspace } = useSession();
  const { theme } = useTheme();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);

    getIframeUrl(module.id, activeWorkspace?.workspace)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });

    // Renews the session cookie without touching the mounted iframe's `src` — reloading
    // it to "refresh" would drop whatever's live inside (an open notebook, a running
    // kernel). A fresh iframe URL carries its own fresh one-time navigation token (the
    // original one is single-use and short-lived, so it can't be replayed here); a
    // plain same-origin fetch of it follows core's redirect and applies its Set-Cookie
    // exactly as a real navigation would, invisibly. A failed renewal is swallowed: the
    // still-mounted iframe keeps working regardless, the next tick tries again, and if
    // every tick fails until the cookie truly lapses, that's a real failure the embedded
    // UI's own requests will surface — not something to retry faster for from out here.
    const renew = () => {
      getIframeUrl(module.id, activeWorkspace?.workspace)
        .then((freshUrl) => fetch(freshUrl, { credentials: "same-origin" }))
        .catch(() => {});
    };
    const interval = setInterval(renew, RENEWAL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [module.id, activeWorkspace?.workspace]);

  // ADR 0075: an optional, opt-in postMessage channel so an iframe-proxy module's
  // embedded content can live-sync with the shell's dark/light theme. Generic across
  // any module — a module that never posts `booth:iframe-ready` gets no messages and
  // is completely unaffected. Never touches the iframe's `src` (same constraint as
  // RENEWAL_INTERVAL_MS above): the theme is pushed to already-rendered content, not
  // carried on a reload. Same-origin by construction (ADR 0069 item B: core's iframe
  // URL is always relative, so the embedded page shares the shell's origin) — both
  // sides validate `event.origin`/`targetOrigin` against it explicitly, never `"*"`.
  //
  // One effect, keyed on `theme`: this is what makes "post again whenever the shell's
  // theme changes" a consequence of the existing theme state (this effect just runs
  // again, tied to nothing new) rather than a separate poll or timer, and it's also
  // what keeps the message listener's reply to a `booth:iframe-ready` handshake always
  // carrying the *current* theme — a listener created once and left alone would close
  // over whatever theme was current at setup time, not whatever it is by the time a
  // module actually finishes loading and asks.
  useEffect(() => {
    function postTheme(target: Window) {
      target.postMessage({ type: "booth:theme", theme } satisfies ThemeMessage, window.location.origin);
    }

    function onMessage(event: MessageEvent) {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow) return;
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeWindow) return;
      if (!isIframeReadyMessage(event.data)) return;
      postTheme(iframeWindow);
    }

    window.addEventListener("message", onMessage);

    // The theme just changed (or this is the initial mount) — push it to whatever's
    // already mounted. Harmless no-op if the iframe hasn't loaded far enough to be
    // listening yet; its own ready-handshake covers that case once it has.
    const currentWindow = iframeRef.current?.contentWindow;
    if (currentWindow) postTheme(currentWindow);

    return () => window.removeEventListener("message", onMessage);
  }, [theme]);

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
      ref={iframeRef}
      src={url}
      title={module.displayName}
      className="h-full w-full border-0"
      // Known failure mode carried over from OpenDataPlatform (ARCHITECTURE.md §6): a
      // third-party UI issuing absolute/root-relative follow-up calls escapes a naive
      // path-prefix proxy. Fixed by ADR 0069 item B (docker/nginx.conf.template's
      // cookie-keyed catch-all), not something this sandbox attribute could compensate
      // for on its own — kept permissive enough for real third-party apps (Superset,
      // JupyterHub) to function.
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
    />
  );
}
