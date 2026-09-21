/**
 * Issuer URL / client ID delivery. ADR 0032 left this mechanism to booth-design; two
 * sources, in precedence order:
 *
 * 1. Runtime: `window.__BOOTH_CONFIG__`, set by /config.js. The container image
 *    (docker/40-booth-config.sh) writes that file at startup from the Helm chart's
 *    `oidc.*` values, so one image serves every deployment. This is why a build-time
 *    variable alone isn't enough once the shell is containerized.
 * 2. Build time: `VITE_OIDC_ISSUER_URL` / `VITE_OIDC_CLIENT_ID`, mirroring booth-core's
 *    own `BOOTH_OIDC_ISSUER_URL`/`BOOTH_OIDC_CLIENT_ID` names — used by `npm run dev`
 *    (public/config.js ships empty, so nothing overrides these locally).
 *
 * Both are public, non-secret values (ADR 0032). Same values booth-core is configured
 * with: per internal/config/config.go, "ClientID is used both for the browser PKCE flow
 * and, when RequireAudience is true, as the expected `aud` claim."
 */

export interface OidcConfig {
  issuerUrl: string;
  clientId: string;
}

let cached: OidcConfig | null = null;

export function getOidcConfig(): OidcConfig {
  if (cached) return cached;

  const runtime = window.__BOOTH_CONFIG__;
  const issuerUrl = runtime?.oidcIssuerUrl || import.meta.env.VITE_OIDC_ISSUER_URL;
  const clientId = runtime?.oidcClientId || import.meta.env.VITE_OIDC_CLIENT_ID;

  if (!issuerUrl || !clientId) {
    throw new Error(
      "Missing OIDC configuration: an issuer URL and client ID must both be set — via the " +
        "chart's oidc.issuerUrl/oidc.clientId in a deployment, or VITE_OIDC_ISSUER_URL and " +
        "VITE_OIDC_CLIENT_ID locally (same values as booth-core's BOOTH_OIDC_ISSUER_URL/" +
        "BOOTH_OIDC_CLIENT_ID).",
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
