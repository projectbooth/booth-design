import { getOidcConfig, getRedirectUri } from "./config";
import { fetchDiscoveryDocument } from "./discovery";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "./pkce";
import { clearTokenState, getTokenState, setTokenState, type TokenState } from "./tokenStore";

/**
 * Client-side OAuth2 Authorization Code + PKCE flow (RFC 7636) against the configured
 * OIDC provider, per ADR 0032. No client secret — this is a public SPA client;
 * booth-core's bearer-only middleware is the resource server, the provider (Keycloak
 * by default, ADR 0004) is the authorization server.
 */

const SS_VERIFIER = "booth-design-pkce-verifier";
const SS_STATE = "booth-design-pkce-state";
const SS_RETURN_TO = "booth-design-pkce-return-to";

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function clearRefreshTimer() {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
}

function toTokenState(res: TokenResponse): TokenState {
  return {
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    idToken: res.id_token,
    expiresAt: Date.now() + res.expires_in * 1000,
  };
}

function applyTokenResponse(res: TokenResponse) {
  const next = toTokenState(res);
  setTokenState(next);
  scheduleRefresh(next);
}

/** Refresh ~60s before expiry (or at the midpoint, for very short-lived tokens) so a
 *  user is never kicked back to login mid-session while the tab stays open. */
function scheduleRefresh(tokenState: TokenState) {
  clearRefreshTimer();
  if (!tokenState.refreshToken) return; // ADR 0032 item 4: only "if the provider issues one"

  const lifetimeMs = tokenState.expiresAt - Date.now();
  const bufferMs = Math.min(60_000, lifetimeMs / 2);
  const delay = Math.max(lifetimeMs - bufferMs, 0);

  refreshTimer = setTimeout(() => {
    void refreshAccessToken().catch(() => {
      // Refresh token expired/revoked — the only recovery is a fresh interactive login.
      redirectToLogin();
    });
  }, delay);
}

export async function refreshAccessToken(): Promise<void> {
  const current = getTokenState();
  if (!current?.refreshToken) throw new Error("No refresh token available");

  const { issuerUrl, clientId } = getOidcConfig();
  const { token_endpoint } = await fetchDiscoveryDocument(issuerUrl);

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: current.refreshToken,
    client_id: clientId,
  });

  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

  applyTokenResponse((await res.json()) as TokenResponse);
}

/** Redirects the browser to the provider's authorization endpoint. `returnTo`
 *  defaults to the current location so a deep link survives the round trip. */
export async function redirectToLogin(returnTo?: string): Promise<never> {
  const { issuerUrl, clientId } = getOidcConfig();
  const { authorization_endpoint } = await fetchDiscoveryDocument(issuerUrl);

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateState();

  sessionStorage.setItem(SS_VERIFIER, verifier);
  sessionStorage.setItem(SS_STATE, state);
  sessionStorage.setItem(SS_RETURN_TO, returnTo ?? `${window.location.pathname}${window.location.search}`);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    scope: "openid profile email",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  window.location.assign(`${authorization_endpoint}?${params.toString()}`);
  // Navigation is async; hang here so callers can `await` this without racing it.
  return new Promise<never>(() => {});
}

export interface CallbackResult {
  handled: boolean;
  returnTo: string;
}

/**
 * Call once on boot. If the current URL carries `code`/`state` (i.e. this load *is*
 * the redirect back from the provider), exchanges the code for tokens and strips the
 * query params from the URL. Otherwise a no-op.
 */
export async function handleRedirectCallback(): Promise<CallbackResult> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    throw new Error(`OIDC provider returned an error: ${error} — ${url.searchParams.get("error_description") ?? ""}`);
  }
  if (!code || !returnedState) {
    return { handled: false, returnTo: "/" };
  }

  const expectedState = sessionStorage.getItem(SS_STATE);
  const verifier = sessionStorage.getItem(SS_VERIFIER);
  const returnTo = sessionStorage.getItem(SS_RETURN_TO) ?? "/";
  sessionStorage.removeItem(SS_STATE);
  sessionStorage.removeItem(SS_VERIFIER);
  sessionStorage.removeItem(SS_RETURN_TO);

  if (!verifier || returnedState !== expectedState) {
    throw new Error("OIDC callback state mismatch — possible CSRF or a stale/duplicate redirect.");
  }

  const { issuerUrl, clientId } = getOidcConfig();
  const { token_endpoint } = await fetchDiscoveryDocument(issuerUrl);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
    client_id: clientId,
    code_verifier: verifier,
  });

  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);

  applyTokenResponse((await res.json()) as TokenResponse);

  // Address-bar cleanup (stripping code/state, restoring returnTo) is AuthGate's job —
  // it needs to happen before the router reads the URL, not before this resolves.
  return { handled: true, returnTo };
}

/** Called by client.ts when an authenticated API call comes back 401 despite a
 *  token being present — the token is invalid/expired in a way the refresh timer
 *  didn't catch. Clears state and starts over rather than looping failed requests. */
export function handleUnauthorized() {
  clearRefreshTimer();
  clearTokenState();
  void redirectToLogin();
}

/** Clears local token state and ends the provider-side session (RP-initiated
 *  logout, per ADR 0032 item 5). */
export async function logout(): Promise<never> {
  const { issuerUrl, clientId } = getOidcConfig();
  const current = getTokenState();
  clearRefreshTimer();
  clearTokenState();

  const { end_session_endpoint } = await fetchDiscoveryDocument(issuerUrl);
  if (!end_session_endpoint) {
    // Provider doesn't support RP-initiated logout — local state is cleared, which is
    // the best we can do; a fresh app load will redirect to login as usual.
    window.location.assign(getRedirectUri());
    return new Promise<never>(() => {});
  }

  const params = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: getRedirectUri(),
  });
  if (current?.idToken) params.set("id_token_hint", current.idToken);

  window.location.assign(`${end_session_endpoint}?${params.toString()}`);
  return new Promise<never>(() => {});
}
