// INVESTIGATION-ONLY. Mocks the gateway API surface (ADR 0005/0025: /api/* and
// /modules/{id}/api/*) at the real network layer via Playwright's page.route, so the
// harness can mount real native modules without a running booth-core. Shapes mirror
// src/__tests__/nativeModules.integration.test.tsx's fixtures.
export async function installMocks(page) {
  await page.route("**/*", async (route) => {
    const u = route.request().url();
    if (!/\/api\//.test(u)) return route.continue();

    const path = new URL(u).pathname;
    let body;
    if (path === "/api/me") {
      body = {
        subject: "harness-user",
        email: "harness@example.test",
        memberships: [{ workspace: "acme-analytics", role: "owner" }],
        active: { workspace: "acme-analytics", role: "owner" },
      };
    } else if (/\/tags$/.test(path)) {
      body = { tags: [] };
    } else if (/\/(datasets|code|dashboards|pipelines|jobs)$/.test(path)) {
      body = { items: [], total: 0, limit: 25, offset: 0 };
    } else if (/\/runners$/.test(path)) {
      body = { items: [] };
    } else if (/\/modules\/logging\/api\/config$/.test(path)) {
      body = { retentionSeconds: 604800, maxQueryRangeSeconds: 86400, maxLimit: 1000, levels: [], scope: "workspace" };
    } else if (/\/modules\/logging\/api\/modules$/.test(path)) {
      body = { modules: [] };
    } else if (/\/modules\/logging\/api\/logs$/.test(path)) {
      // Non-empty fixture so the log list rows the bug report named actually render.
      // Real LogEntry shape (booth-logging/web/src/types.ts): `line`, not `message`.
      body = {
        entries: [
          { timestamp: "2026-10-06T00:00:00Z", cursor: "1", line: "harness fixture log line", level: "info", module: "storage" },
        ],
        query: "",
      };
    } else if (/\/modules\/database\/api\/status$/.test(path)) {
      body = { workspace: "acme-analytics", provisioned: false, database: null, operator: false };
    } else if (/\/modules\/database\/api\/databases$/.test(path)) {
      body = { items: [] };
    } else if (/\/modules\/lakehouse\/api\/admin\/warehouses$/.test(path)) {
      body = { scope: "workspace", items: [] };
    } else if (/\/kinds$/.test(path)) {
      body = { kinds: ["s3", "filesystem", "azure", "gcs"], filesystemEnabled: true };
    } else if (/\/objects$/.test(path)) {
      body = { entries: [{ path: "data/example.csv", size: 1024, modTime: "2026-10-01T00:00:00Z", contentType: "text/csv" }] };
    } else if (/\/backends$/.test(path)) {
      // Real BackendSummary/AdminBackend shape (booth-storage/web/src/types.ts) -- a
      // non-empty fixture so the table rows (and the amber "s3" badge) the bug report
      // named actually render, instead of the empty state.
      body = [
        {
          id: "b1",
          displayName: "Primary S3",
          kind: "s3",
          location: "s3://acme-data/prod",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          config: {},
          credentialsSet: true,
        },
      ];
    } else {
      // Matches nativeModules.integration.test.tsx's fallback exactly: a bare array.
      // storage-ui's /backends and /admin/backends (h.find(...) in its own bundle) are
      // the reason this must stay a plain array, not {items: []} -- that mismatch was
      // caught here the same way the integration test's suite would catch it.
      body = [];
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}
