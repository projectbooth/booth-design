/**
 * Issuer URL / client ID delivery: build-time Vite env vars, deliberately mirroring
 * booth-core's own `BOOTH_OIDC_ISSUER_URL`/`BOOTH_OIDC_CLIENT_ID` names (internal/
 * config/config.go) — the same deployment sets both, since (per that file's own
 * comment) "ClientID is used both for the browser PKCE flow and, when
 * RequireAudience is true, as the expected `aud` claim." ADR 0032 explicitly leaves
 * this mechanism to booth-design's judgment; chosen over an `/api/config` endpoint
 * because these are public, non-secret values (ADR 0032 says so directly) and core
 * doesn't currently expose one — adding it would be a core-side contract change this
 * repo doesn't own. Revisit if ops tooling later wants runtime reconfiguration
 * without a shell rebuild.
 */

export interface OidcConfig {
  issuerUrl: string;
  clientId: string;
}

let cached: OidcConfig | null = null;

export function getOidcConfig(): OidcConfig {
  if (cached) return cached;

  const issuerUrl = import.meta.env.VITE_OIDC_ISSUER_URL;
  const clientId = import.meta.env.VITE_OIDC_CLIENT_ID;

  if (!issuerUrl || !clientId) {
    throw new Error(
      "Missing OIDC configuration: VITE_OIDC_ISSUER_URL and VITE_OIDC_CLIENT_ID must both be set " +
        "(same values as booth-core's BOOTH_OIDC_ISSUER_URL/BOOTH_OIDC_CLIENT_ID).",
    );
  }

  cached = { issuerUrl: issuerUrl.replace(/\/$/, ""), clientId };
  return cached;
}

/** Fixed: the app's own origin. Avoids needing a dedicated /auth/callback route —
 *  AuthGate checks for `code`/`state` in the URL regardless of path on every boot. */
export function getRedirectUri(): string {
  return `${window.location.origin}/`;
}
