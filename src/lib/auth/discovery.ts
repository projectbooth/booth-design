/** Standard OIDC discovery (fetched once, cached for the page's lifetime — a full
 *  reload re-fetches, which is fine since it's a cheap, cacheable-by-the-browser GET). */
export interface OidcDiscoveryDocument {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
  jwks_uri: string;
}

let cached: Promise<OidcDiscoveryDocument> | null = null;

export function fetchDiscoveryDocument(issuerUrl: string): Promise<OidcDiscoveryDocument> {
  if (!cached) {
    cached = fetch(`${issuerUrl}/.well-known/openid-configuration`)
      .then((res) => {
        if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status} ${res.statusText}`);
        return res.json() as Promise<OidcDiscoveryDocument>;
      })
      .catch((err) => {
        cached = null; // don't pin a failed fetch — let the next attempt retry
        throw err;
      });
  }
  return cached;
}
