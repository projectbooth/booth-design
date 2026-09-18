import { describe, expect, it } from "vitest";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "../pkce";

describe("generateCodeVerifier", () => {
  it("produces a URL-safe string with no padding (RFC 7636 §4.1)", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(verifier.length).toBeGreaterThanOrEqual(43);
  });

  it("is different on every call", () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier());
  });
});

describe("generateState", () => {
  it("is different on every call", () => {
    expect(generateState()).not.toBe(generateState());
  });
});

describe("generateCodeChallenge", () => {
  it("is deterministic for a given verifier (SHA-256, base64url)", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    // RFC 7636 Appendix B's worked example.
    expect(await generateCodeChallenge(verifier)).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("is URL-safe with no padding", async () => {
    const challenge = await generateCodeChallenge(generateCodeVerifier());
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
