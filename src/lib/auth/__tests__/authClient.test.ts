import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTokenState, getTokenState } from "../tokenStore";

vi.mock("../config", () => ({
  getOidcConfig: () => ({ issuerUrl: "https://idp.example.com/realms/booth", clientId: "booth-design" }),
  getRedirectUri: () => "http://localhost:5173/",
}));

vi.mock("../discovery", () => ({
  fetchDiscoveryDocument: () =>
    Promise.resolve({
      authorization_endpoint: "https://idp.example.com/protocol/openid-connect/auth",
      token_endpoint: "https://idp.example.com/protocol/openid-connect/token",
      end_session_endpoint: "https://idp.example.com/protocol/openid-connect/logout",
      jwks_uri: "https://idp.example.com/protocol/openid-connect/certs",
    }),
}));

const SS_VERIFIER = "booth-design-pkce-verifier";
const SS_STATE = "booth-design-pkce-state";
const SS_RETURN_TO = "booth-design-pkce-return-to";

beforeEach(() => {
  sessionStorage.clear();
  window.history.pushState({}, "", "/");
});

afterEach(() => {
  clearTokenState();
  vi.unstubAllGlobals();
});

describe("handleRedirectCallback", () => {
  it("is a no-op when the URL carries no code/state", async () => {
    const { handleRedirectCallback } = await import("../authClient");
    const result = await handleRedirectCallback();
    expect(result).toEqual({ handled: false, returnTo: "/" });
  });

  it("rejects a state that doesn't match what was stored before the redirect", async () => {
    sessionStorage.setItem(SS_VERIFIER, "verifier-1");
    sessionStorage.setItem(SS_STATE, "expected-state");
    sessionStorage.setItem(SS_RETURN_TO, "/storage");
    window.history.pushState({}, "", "/?code=auth-code-1&state=WRONG-state");

    const { handleRedirectCallback } = await import("../authClient");
    await expect(handleRedirectCallback()).rejects.toThrow(/state mismatch/i);
  });

  it("exchanges the code for tokens and returns the stored returnTo on a matching state", async () => {
    sessionStorage.setItem(SS_VERIFIER, "verifier-1");
    sessionStorage.setItem(SS_STATE, "matching-state");
    sessionStorage.setItem(SS_RETURN_TO, "/storage/buckets");
    window.history.pushState({}, "", "/?code=auth-code-1&state=matching-state");

    const tokenResponse = {
      access_token: "access-1",
      refresh_token: "refresh-1",
      id_token: "id-1",
      expires_in: 3600,
      token_type: "Bearer",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(tokenResponse) }),
    );

    const { handleRedirectCallback } = await import("../authClient");
    const result = await handleRedirectCallback();

    expect(result).toEqual({ handled: true, returnTo: "/storage/buckets" });
    expect(getTokenState()?.accessToken).toBe("access-1");
    expect(getTokenState()?.refreshToken).toBe("refresh-1");
    // Single-use PKCE artifacts must not survive a completed exchange.
    expect(sessionStorage.getItem(SS_VERIFIER)).toBeNull();
    expect(sessionStorage.getItem(SS_STATE)).toBeNull();
    expect(sessionStorage.getItem(SS_RETURN_TO)).toBeNull();
  });

  it("surfaces the provider's error param instead of attempting a token exchange", async () => {
    window.history.pushState({}, "", "/?error=access_denied&error_description=user+cancelled");
    const { handleRedirectCallback } = await import("../authClient");
    await expect(handleRedirectCallback()).rejects.toThrow(/access_denied/);
  });
});
