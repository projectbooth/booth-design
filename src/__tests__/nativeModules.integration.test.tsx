import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
        : /\/(datasets|code|dashboards|pipelines|jobs)(\?|$)/.test(String(url))
          ? { items: [], total: 0, limit: 25, offset: 0 }
          : /\/runners$/.test(String(url))
            ? { items: [] }
            : /\/modules\/logging\/api\/config/.test(String(url))
              ? { retentionSeconds: 604800, maxQueryRangeSeconds: 86400, maxLimit: 1000, levels: [], scope: "workspace" }
              : /\/modules\/logging\/api\/modules(\?|$)/.test(String(url))
                ? { modules: [] }
                : /\/modules\/logging\/api\/logs(\?|$)/.test(String(url))
                  ? { entries: [], query: "" }
                  : /\/modules\/database\/api\/status$/.test(String(url))
                    ? { workspace: "acme-analytics", provisioned: false, database: null, operator: false }
                    : /\/modules\/database\/api\/databases(\?|$)/.test(String(url))
                      ? { items: [] }
                      : /\/modules\/database\/api\/tables(\?|$)/.test(String(url))
                        ? {
                            workspace: "acme-analytics",
                            provisioned: true,
                            tables: [
                              {
                                schema: "public",
                                name: "orders",
                                kind: "table",
                                comment: null,
                                columns: [],
                                approxRows: 10,
                                schemaHash: "h1",
                                writableThrough: [{ grant: "manual-grant", operations: ["insert"], columns: ["name"] }],
                              },
                            ],
                          }
                        : /\/modules\/lakehouse\/api\/admin\/warehouses$/.test(String(url))
                        ? { scope: "workspace", items: [] }
                        : /\/modules\/api\/api\/(apis|keys)(\?|$)/.test(String(url))
                          ? { items: [] }
                          : /\/service-accounts\/uses$/.test(String(url))
                            ? { items: [] }
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

  it('a booth-streamlit link opens the admin page straight to the "App uploads" tab', async () => {
    window.history.pushState({}, "", "/storage/admin?panel=upload-grants");
    mount("storage");
    await waitFor(() => expect(calls.some((c) => c.url.includes("/api/admin/upload-grants"))).toBe(true));
    expect(screen.getByRole("tab", { name: "App uploads" })).toHaveAttribute("aria-selected", "true");
    expectAuthenticated(calls);
  });

  it("offers a Credential provider choice when adding an S3 backend, hiding the session token for SeaweedFS IAM", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const headers: Record<string, string> = {};
        new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
        calls.push({ url: String(url), headers });
        const u = String(url);
        const body = /\/modules\/storage\/api\/kinds$/.test(u)
          ? { kinds: ["s3", "filesystem", "azure", "gcs"], filesystemEnabled: true }
          : [];
        return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) } as Response;
      }),
    );
    const user = userEvent.setup();
    window.history.pushState({}, "", "/storage/admin");
    mount("storage");
    await user.click(await screen.findByRole("button", { name: "Add backend" }));

    const form = within(screen.getByRole("form", { name: "Add a storage backend" }));
    expect(form.getByLabelText("Credential provider")).toHaveValue("");
    expect(form.getByLabelText("Session token")).toBeInTheDocument();

    await user.selectOptions(form.getByLabelText("Credential provider"), "seaweedfs-iam");
    expect(form.queryByLabelText("Session token")).not.toBeInTheDocument();
    expect(form.getByText(/SeaweedFS IAM mints scoped access keys with no session token/)).toBeInTheDocument();
  });

  it("offers the same Credential provider choice when editing an existing S3 backend", async () => {
    const existingBackend = {
      id: "lake",
      displayName: "Lake",
      kind: "s3",
      location: "s3://lake-bucket",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
      config: { bucket: "lake-bucket" },
      credentialsSet: true,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const headers: Record<string, string> = {};
        new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
        calls.push({ url: String(url), headers });
        const u = String(url);
        const body = /\/modules\/storage\/api\/kinds$/.test(u)
          ? { kinds: ["s3", "filesystem", "azure", "gcs"], filesystemEnabled: true }
          : /\/modules\/storage\/api\/admin\/backends$/.test(u)
            ? [existingBackend]
            : [];
        return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) } as Response;
      }),
    );
    const user = userEvent.setup();
    window.history.pushState({}, "", "/storage/admin");
    mount("storage");
    await user.click(await screen.findByRole("button", { name: "Edit Lake" }));

    const form = within(screen.getByRole("form", { name: "Edit Lake" }));
    expect(form.getByLabelText("Credential provider")).toHaveValue(""); // MinIO admin API, this backend's saved default
    expect(form.getByLabelText("Session token")).toBeInTheDocument();

    await user.selectOptions(form.getByLabelText("Credential provider"), "seaweedfs-iam");
    expect(form.queryByLabelText("Session token")).not.toBeInTheDocument();
    expect(form.getByText(/SeaweedFS IAM mints scoped access keys with no session token/)).toBeInTheDocument();
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

describe("pipeline (real @projectbooth/pipeline-ui)", () => {
  it("renders instead of the placeholder, and authenticates its requests", async () => {
    window.history.pushState({}, "", "/pipeline");
    mount("pipeline");
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(screen.queryByText(/aren't wired into the shell yet/)).toBeNull();
    expectAuthenticated(calls);
  });
});

describe("logging (real @projectbooth/logging-ui)", () => {
  it("renders instead of the placeholder, and authenticates its requests", async () => {
    window.history.pushState({}, "", "/logging");
    mount("logging");
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(screen.queryByText(/aren't wired into the shell yet/)).toBeNull();
    expectAuthenticated(calls);
  });
});

describe("database (real @projectbooth/database-ui)", () => {
  it("renders instead of the placeholder, and authenticates its requests", async () => {
    window.history.pushState({}, "", "/database");
    mount("database");
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(screen.queryByText(/aren't wired into the shell yet/)).toBeNull();
    expectAuthenticated(calls);
  });

  it('badges a table writable through an API, linking to /apis', async () => {
    window.history.pushState({}, "", "/database/tables");
    mount("database");
    await waitFor(() => expect(calls.some((c) => c.url.includes("/api/tables"))).toBe(true));
    const badge = await screen.findByRole("link", { name: "Writable through an API" });
    expect(badge).toHaveAttribute("href", "/apis");
    expectAuthenticated(calls);
  });
});

describe("lakehouse (real @projectbooth/lakehouse-ui)", () => {
  it("renders instead of the placeholder, and authenticates its requests", async () => {
    window.history.pushState({}, "", "/lakehouse");
    mount("lakehouse");
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(screen.queryByText(/aren't wired into the shell yet/)).toBeNull();
    expectAuthenticated(calls);
  });
});

describe("api (real @projectbooth/api-ui)", () => {
  it("renders instead of the placeholder, and authenticates its requests", async () => {
    window.history.pushState({}, "", "/apis");
    mount("api");
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(screen.queryByText(/aren't wired into the shell yet/)).toBeNull();
    expectAuthenticated(calls);
  });

  it("prefills the grant banner from booth-streamlit's write-link URL params", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const headers: Record<string, string> = {};
        new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
        calls.push({ url: String(url), headers });
        const u = String(url);
        const body = /\/modules\/api\/api\/apis\/[^/]+\/writes$/.test(u)
          ? { apiId: "ds1", writes: null, columns: [], hasPrimaryKey: true, needsRegenerate: false, dataAccess: true }
          : /\/modules\/api\/api\/apis(\?|$)/.test(u)
            ? {
                items: [
                  {
                    id: "ds1",
                    datasetId: "cat1",
                    datasetName: "Orders",
                    slug: "ds1",
                    table: { schema: "public", name: "orders" },
                    columns: [],
                    primaryKey: [],
                    createdBy: "a@b.com",
                    createdAt: "2026-10-15T00:00:00Z",
                    generatedAt: "2026-10-15T00:00:00Z",
                    writes: null,
                  },
                ],
              }
            : /\/modules\/api\/api\/keys(\?|$)/.test(u)
              ? { items: [] }
              : /\/(datasets)(\?|$)/.test(u)
                ? { items: [], total: 0 }
                : [];
        return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) } as Response;
      }),
    );
    window.history.pushState({}, "", "/apis?writeApi=ds1&writePrincipal=streamlit:acme:app1");
    mount("api");
    const banner = await screen.findByRole("status");
    expect(banner.textContent).toMatch(/Grant\s*streamlit:acme:app1\s*writes to Orders: check the form under its Writes below\./);
    expectAuthenticated(calls);
  });
});
