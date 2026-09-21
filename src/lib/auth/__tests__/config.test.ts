import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// config.ts memoizes its result, so each test loads a fresh copy of the module.
async function load() {
  vi.resetModules();
  return import("../config");
}

beforeEach(() => {
  vi.stubEnv("VITE_OIDC_ISSUER_URL", "");
  vi.stubEnv("VITE_OIDC_CLIENT_ID", "");
  window.__BOOTH_CONFIG__ = undefined;
});

afterEach(() => {
  vi.unstubAllEnvs();
  window.__BOOTH_CONFIG__ = undefined;
});

describe("getOidcConfig", () => {
  it("uses the runtime config that /config.js injects (the container-image path)", async () => {
    window.__BOOTH_CONFIG__ = { oidcIssuerUrl: "https://idp.example.com/realms/booth", oidcClientId: "booth-design" };
    const { getOidcConfig } = await load();
    expect(getOidcConfig()).toEqual({ issuerUrl: "https://idp.example.com/realms/booth", clientId: "booth-design" });
  });

  it("falls back to the build-time VITE_ variables when runtime config is empty (npm run dev)", async () => {
    window.__BOOTH_CONFIG__ = {};
    vi.stubEnv("VITE_OIDC_ISSUER_URL", "https://dev-idp.example.com/realms/booth");
    vi.stubEnv("VITE_OIDC_CLIENT_ID", "dev-client");
    const { getOidcConfig } = await load();
    expect(getOidcConfig()).toEqual({ issuerUrl: "https://dev-idp.example.com/realms/booth", clientId: "dev-client" });
  });

  it("prefers runtime config over build-time values when both are present", async () => {
    window.__BOOTH_CONFIG__ = { oidcIssuerUrl: "https://runtime.example.com", oidcClientId: "runtime-client" };
    vi.stubEnv("VITE_OIDC_ISSUER_URL", "https://buildtime.example.com");
    vi.stubEnv("VITE_OIDC_CLIENT_ID", "buildtime-client");
    const { getOidcConfig } = await load();
    expect(getOidcConfig().issuerUrl).toBe("https://runtime.example.com");
    expect(getOidcConfig().clientId).toBe("runtime-client");
  });

  it("strips a trailing slash from the issuer so discovery URLs don't double up", async () => {
    window.__BOOTH_CONFIG__ = { oidcIssuerUrl: "https://idp.example.com/realms/booth/", oidcClientId: "c" };
    const { getOidcConfig } = await load();
    expect(getOidcConfig().issuerUrl).toBe("https://idp.example.com/realms/booth");
  });

  it("throws a clear error when neither source provides both values", async () => {
    window.__BOOTH_CONFIG__ = { oidcIssuerUrl: "https://idp.example.com" }; // clientId missing
    const { getOidcConfig } = await load();
    expect(() => getOidcConfig()).toThrow(/Missing OIDC configuration/);
  });
});
