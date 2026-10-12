import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";

// Contract test (ADR 0113 / contracts/module-manifest.md "Chart annotation: identity
// keys"): the booth.projectbooth.io/identity-keys annotation on Chart.yaml must be valid
// JSON, name only known shared settings, and every path it maps to must actually have a
// default in values.yaml -- otherwise core's install-time merge (and a plain `helm
// template`/CLI install) would silently do nothing for a typo'd path. Ported from
// booth-storage's Go test/contract/manifest_test.go TestChart_IdentityKeysAnnotation to
// this repo's Vitest/TypeScript layout; booth-design has no BoothModule manifest to
// render (it isn't a BoothModule), so this reads Chart.yaml/values.yaml directly rather
// than via `helm template`.

const chartDir = join(dirname(fileURLToPath(import.meta.url)), "..");

const knownKeys = new Set([
  "issuerUrl",
  "clientId",
  "jwksUrl",
  "workloadIssuerUrl",
  "groupsClaim",
  "iframeIssuerUrl",
]);

function valueAtPath(root: unknown, dotted: string): { found: boolean } {
  let cur = root;
  for (const part of dotted.split(".")) {
    if (typeof cur !== "object" || cur === null || !(part in cur)) {
      return { found: false };
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return { found: true };
}

describe("booth.projectbooth.io/identity-keys annotation", () => {
  const chart = load(readFileSync(join(chartDir, "Chart.yaml"), "utf8")) as {
    annotations?: Record<string, string>;
  };
  const raw = chart.annotations?.["booth.projectbooth.io/identity-keys"];

  it("is present on Chart.yaml", () => {
    expect(raw, "Chart.yaml is missing the booth.projectbooth.io/identity-keys annotation (ADR 0113)").toBeDefined();
  });

  it("is valid, non-empty JSON naming only known shared settings", () => {
    const mapping = JSON.parse(raw!) as Record<string, string>;
    expect(Object.keys(mapping).length).toBeGreaterThan(0);
    for (const key of Object.keys(mapping)) {
      expect(knownKeys.has(key), `identity-keys names unknown shared setting ${key}`).toBe(true);
    }
  });

  it("maps every path to a leaf with a default in values.yaml", () => {
    const mapping = JSON.parse(raw!) as Record<string, string>;
    const values = load(readFileSync(join(chartDir, "values.yaml"), "utf8"));
    for (const [key, path] of Object.entries(mapping)) {
      expect(
        valueAtPath(values, path).found,
        `identity-keys maps ${key} to values.yaml path ${path}, which has no default in values.yaml`,
      ).toBe(true);
    }
  });

  it("maps exactly this shell's two identity settings (ADR 0032: client-side PKCE, no JWKS/workload/groups setting of its own)", () => {
    const mapping = JSON.parse(raw!) as Record<string, string>;
    expect(mapping).toEqual({
      issuerUrl: "oidc.issuerUrl",
      clientId: "oidc.clientId",
    });
  });
});
