import { afterEach, describe, expect, it, vi } from "vitest";
import { isProjectsEnabled } from "../featureFlags";

afterEach(() => {
  delete window.__BOOTH_CONFIG__;
  vi.unstubAllEnvs();
});

describe("isProjectsEnabled", () => {
  it("is off by default (no runtime config, no build-time flag)", () => {
    expect(isProjectsEnabled()).toBe(false);
  });

  it("follows the build-time flag when there's no runtime config", () => {
    vi.stubEnv("VITE_ENABLE_PROJECTS", "true");
    expect(isProjectsEnabled()).toBe(true);
  });

  it("prefers runtime config (true) over the build-time flag", () => {
    vi.stubEnv("VITE_ENABLE_PROJECTS", "false");
    window.__BOOTH_CONFIG__ = { enableProjects: true };
    expect(isProjectsEnabled()).toBe(true);
  });

  it("prefers runtime config (false) over the build-time flag", () => {
    vi.stubEnv("VITE_ENABLE_PROJECTS", "true");
    window.__BOOTH_CONFIG__ = { enableProjects: false };
    expect(isProjectsEnabled()).toBe(false);
  });
});
