import { afterEach, describe, expect, it, vi } from "vitest";
import { clearTokenState, getAccessToken, getTokenState, setTokenState, subscribe } from "../tokenStore";

afterEach(() => {
  clearTokenState();
});

describe("tokenStore", () => {
  it("starts empty", () => {
    expect(getTokenState()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("returns the current access token once set", () => {
    setTokenState({ accessToken: "tok-1", expiresAt: Date.now() + 60_000 });
    expect(getAccessToken()).toBe("tok-1");
  });

  it("clears state (ADR 0032: never persisted, in-memory only)", () => {
    setTokenState({ accessToken: "tok-1", expiresAt: Date.now() + 60_000 });
    clearTokenState();
    expect(getAccessToken()).toBeNull();
    expect(getTokenState()).toBeNull();
  });

  it("notifies subscribers on set and clear", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    setTokenState({ accessToken: "tok-1", expiresAt: Date.now() + 60_000 });
    expect(listener).toHaveBeenCalledTimes(1);

    clearTokenState();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setTokenState({ accessToken: "tok-2", expiresAt: Date.now() + 60_000 });
    expect(listener).toHaveBeenCalledTimes(2); // no further calls after unsubscribe
  });
});
