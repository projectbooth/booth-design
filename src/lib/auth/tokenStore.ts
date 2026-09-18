/**
 * In-memory-only token state (ADR 0032: "not localStorage, to reduce exposure if a
 * script-injection vulnerability is ever found elsewhere"). Deliberately a plain
 * module-level variable, not React state — src/lib/api/client.ts needs synchronous,
 * import-and-call access to the current access token on every request, with no
 * dependency on React's render cycle. A page reload clears this by construction
 * (nothing here is persisted anywhere) — expected per the ADR's "held in memory for
 * the session's lifetime," not a bug to work around.
 */

export interface TokenState {
  accessToken: string;
  refreshToken?: string;
  /** Kept only to pass as `id_token_hint` on logout — never parsed/trusted client-side. */
  idToken?: string;
  /** Epoch ms. */
  expiresAt: number;
}

let state: TokenState | null = null;
const listeners = new Set<() => void>();

export function getTokenState(): TokenState | null {
  return state;
}

export function getAccessToken(): string | null {
  return state?.accessToken ?? null;
}

export function setTokenState(next: TokenState) {
  state = next;
  for (const l of listeners) l();
}

export function clearTokenState() {
  state = null;
  for (const l of listeners) l();
}

/** For React's useSyncExternalStore (src/lib/auth/AuthGate.tsx). */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
