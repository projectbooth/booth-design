/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OIDC_ISSUER_URL?: string;
  readonly VITE_OIDC_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Runtime config injected by /config.js (see src/lib/auth/config.ts). */
  __BOOTH_CONFIG__?: {
    oidcIssuerUrl?: string;
    oidcClientId?: string;
  };
}
