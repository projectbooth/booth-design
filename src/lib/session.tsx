import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe } from "./api/client";
import type { Identity, Membership } from "./api/types";

const ACTIVE_WORKSPACE_KEY = "booth-design-active-workspace";

interface SessionState {
  identity: Identity | null;
  loading: boolean;
  error: string | null;
  /** null means zero workspace memberships — the onboarding state ADR 0025 §5 describes,
   *  not an error. */
  activeWorkspace: Membership | null;
  setActiveWorkspace: (slug: string) => void;
  refresh: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

function resolveActiveWorkspace(
  identity: Identity | null,
  requestedSlug: string | null,
): Membership | null {
  if (!identity || identity.memberships.length === 0) return null;
  const requested = requestedSlug && identity.memberships.find((m) => m.workspace === requestedSlug);
  if (requested) return requested;
  // No stored preference, or it no longer matches a current membership (ADR 0025 §5:
  // "the frontend persists last-selected workspace and re-validates it against the
  // token's current claims each session") — fall back to core's own resolved active
  // membership, then the first membership.
  return identity.active ?? identity.memberships[0];
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestedSlug, setRequestedSlug] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    } catch {
      return null;
    }
  });

  const load = useCallback(() => {
    setLoading(true);
    getMe()
      .then((id) => {
        setIdentity(id);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const activeWorkspace = useMemo(
    () => resolveActiveWorkspace(identity, requestedSlug),
    [identity, requestedSlug],
  );

  const setActiveWorkspace = useCallback((slug: string) => {
    setRequestedSlug(slug);
    try {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, slug);
    } catch {
      // best-effort only
    }
  }, []);

  const value: SessionState = {
    identity,
    loading,
    error,
    activeWorkspace,
    setActiveWorkspace,
    refresh: load,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
