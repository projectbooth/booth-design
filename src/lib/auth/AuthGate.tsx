import { type ReactNode, useEffect, useState } from "react";
import { getAccessToken, subscribe } from "./tokenStore";
import { handleRedirectCallback, redirectToLogin } from "./authClient";

type Status = "booting" | "redirecting" | "ready" | "error";

// Module-level, not component state: guards against React 18 StrictMode's dev-only
// synchronous mount→unmount→mount, which would otherwise run the boot sequence twice
// and try to exchange the same single-use authorization code twice.
let bootStarted = false;

/**
 * Runs once, before anything else in the app renders: handles the OIDC redirect
 * callback if this load *is* one, otherwise sends the browser to the provider's
 * login page (ADR 0032). Children only ever render once a valid access token is in
 * memory — no route in this app is reachable pre-auth.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("booting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Re-render on logout (tokenStore cleared) so a stale "ready" view doesn't linger
  // showing content the in-memory token is no longer there to back.
  const [, forceUpdate] = useState(0);

  useEffect(() => subscribe(() => forceUpdate((n) => n + 1)), []);

  useEffect(() => {
    if (bootStarted) return;
    bootStarted = true;

    (async () => {
      try {
        const result = await handleRedirectCallback();
        if (result.handled) {
          window.history.replaceState({}, "", result.returnTo || "/");
          setStatus("ready");
          return;
        }
        if (getAccessToken()) {
          setStatus("ready"); // dev HMR edge case; never true on a real fresh load
          return;
        }
        setStatus("redirecting");
        await redirectToLogin(); // navigates away; never resolves
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    })();
  }, []);

  if (status === "error") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-text">
        <h1 className="text-[16px] font-semibold text-danger">Couldn't sign you in</h1>
        <p className="max-w-md text-[13.5px] text-text-muted">{errorMessage}</p>
        <button
          onClick={() => window.location.assign("/")}
          className="mt-2 rounded-md border border-border bg-bg-elevated px-4 py-2 text-[13px] font-semibold text-text hover:bg-bg-sunken"
        >
          Try again
        </button>
      </div>
    );
  }

  if (status !== "ready" || !getAccessToken()) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg text-text-muted">
        {status === "redirecting" ? "Redirecting to sign in…" : "Loading…"}
      </div>
    );
  }

  return <>{children}</>;
}
