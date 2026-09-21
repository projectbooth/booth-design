import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserRouter, useLocation } from "react-router-dom";
import { NativeModulePane } from "@/components/shell/NativeModulePane";
import { clearTokenState, setTokenState } from "@/lib/auth/tokenStore";
import type { Membership, ModuleSummary } from "@/lib/api/types";
import "../nativeModuleRegistrations";

// The real published UI packages, mounted through the shell's real NativeModulePane and
// a real BrowserRouter — only the network is faked. The unit tests elsewhere pin the
// registry and prop contract; this pins that the actual packages honor them: they render
// (rather than the "not wired in" placeholder), authenticate every request the way ADR
// 0032/0033 require, and cooperate with the shell's router. This is the class of gap
// (a package added but never registered, or registered but incompatible) that only
// showed up in a real browser before.

let active: Membership = { workspace: "acme-analytics", role: "owner" };
vi.mock("@/lib/session", () => ({ useSession: () => ({ activeWorkspace: active }) }));

const mod = (id: string): ModuleSummary => ({ id, displayName: id, version: "0.1.0", hasOwnUi: true });

function CurrentPath() {
  return <div data-testid="router-path">{useLocation().pathname}</div>;
}

interface Call {
  url: string;
  headers: Record<string, string>;
}
let calls: Call[] = [];

beforeEach(() => {
  calls = [];
  active = { workspace: "acme-analytics", role: "owner" };
  setTokenState({ accessToken: "live-token-1", expiresAt: Date.now() + 60_000 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const headers: Record<string, string> = {};
      new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
      calls.push({ url: String(url), headers });
      // Response shapes match what each package's own API client expects.
      const body = /\/tags$/.test(String(url))
        ? { tags: [] }
        : /\/(datasets|code|dashboards)(\?|$)/.test(String(url))
          ? { items: [], total: 0, limit: 25, offset: 0 }
          : [];
      return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) } as Response;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearTokenState();
  window.history.pushState({}, "", "/");
});

function mount(id: string) {
  return render(
    <BrowserRouter>
      <CurrentPath />
      <NativeModulePane module={mod(id)} />
    </BrowserRouter>,
  );
}

function expectAuthenticated(recorded: Call[]) {
  expect(recorded.length).toBeGreaterThan(0);
  for (const c of recorded) {
    expect(c.headers["authorization"]).toBe("Bearer live-token-1");
    expect(c.headers["x-workspace"]).toBe("acme-analytics");
  }
}

describe("storage (real @projectbooth/storage-ui)", () => {
  it("renders instead of the placeholder, and authenticates its requests", async () => {
    window.history.pushState({}, "", "/storage");
    mount("storage");
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(screen.queryByText(/aren't wired into the shell yet/)).toBeNull();
    expectAuthenticated(calls);
  });

  it("one registration serves both navPath and adminNavPath, as different views", async () => {
    window.history.pushState({}, "", "/storage");
    const browse = mount("storage");
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/api/backends"))).toBe(true));
    const browseText = browse.container.textContent;
    browse.unmount();

    calls = [];
    window.history.pushState({}, "", "/storage/admin");
    const admin = mount("storage");
    await waitFor(() => expect(calls.some((c) => c.url.includes("/api/admin/backends"))).toBe(true));
    expect(admin.container.textContent).not.toBe(browseText);
    expectAuthenticated(calls);
  });
});

describe("catalog (real @projectbooth/catalog-ui)", () => {
  it("renders instead of the placeholder, and authenticates its requests", async () => {
    window.history.pushState({}, "", "/catalog");
    mount("catalog");
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(screen.queryByText(/aren't wired into the shell yet/)).toBeNull();
    expectAuthenticated(calls);
  });

  it("an in-module navigation is picked up by the shell's router, with no page reload", async () => {
    window.history.pushState({}, "", "/catalog");
    const { container } = mount("catalog");
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));

    const codeLink = Array.from(container.querySelectorAll("a")).find((a) => a.textContent === "Code");
    expect(codeLink).toBeTruthy();
    await act(async () => codeLink!.click());

    // The package navigates with pushState + a synthetic popstate; both the address bar
    // and React Router (which only listens for popstate) must have followed.
    expect(window.location.pathname).toBe("/catalog/code");
    expect(screen.getByTestId("router-path").textContent).toBe("/catalog/code");
  });
});
