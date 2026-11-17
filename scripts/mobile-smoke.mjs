#!/usr/bin/env node
// docs/mobile.md / the phone-friendly viewing brief, step 5: a real-browser smoke test
// that boots the actual app (no backend exists in CI or this environment — booth-core
// is a separate repo) by mocking the network at the Playwright layer, then drives the
// drawer exactly as a phone user would: open it, navigate to Home, Catalog, and a
// Streamlit-shaped iframe-proxy app, and confirm none of them ever grows a horizontal
// scrollbar. Runs at both the phone target width (390px) and the tablet-portrait one
// (768px, still inside the drawer breakpoint per useIsDesktop.ts), in light and dark.
//
// This is a *shell* smoke test: Catalog is mocked only enough to render its list view
// (the same response shapes src/__tests__/nativeModules.integration.test.tsx already
// proved correct against the real published package) — asserting on Catalog's own
// internal correctness is that package's job, not this repo's.

import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 5183;
const BASE_URL = `http://localhost:${PORT}`;
const ISSUER = "https://fake-issuer.test";

function jsonResponse(body) {
  return { status: 200, contentType: "application/json", body: JSON.stringify(body) };
}

// Takes the spawned child so a dead-on-arrival server (e.g. PORT already taken by a
// leftover process from a previous run that didn't get cleaned up) fails fast with a
// clear cause, instead of either waiting out the full timeout or -- worse -- silently
// passing against whatever stray process already answers on PORT.
async function waitForServer(child) {
  let exited = false;
  const onExit = (code) => {
    exited = true;
    if (code !== 0) console.error(`dev server process exited early with code ${code}`);
  };
  child.once("exit", onExit);

  for (let i = 0; i < 60; i++) {
    if (exited) throw new Error(`dev server process exited before it ever answered on ${BASE_URL}`);
    try {
      const res = await fetch(BASE_URL);
      if (res.ok) {
        // Up and answering -- from here on, an exit is this script's own deliberate
        // shutdown (stopDevServer), not a failure worth logging.
        child.off("exit", onExit);
        return;
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`dev server never came up on ${BASE_URL}`);
}

function startDevServer() {
  const viteBin = path.join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite");
  // A single command string, not an args array, with shell: true -- avoids both
  // Windows's EINVAL spawning a .cmd file directly and Node's shell+argv-array
  // deprecation warning (there's no user input in this fixed command to escape).
  const child = spawn(`"${viteBin}" --port ${PORT} --strictPort`, {
    cwd: repoRoot,
    env: {
      ...process.env,
      VITE_OIDC_ISSUER_URL: ISSUER,
      VITE_OIDC_CLIENT_ID: "booth-design",
    },
    stdio: "pipe",
    shell: true,
  });
  child.stderr.on("data", (d) => process.stderr.write(d));
  return child;
}

// shell: true means `child` is cmd.exe/sh, not vite itself -- plain child.kill() only
// ever terminates that shell wrapper on Windows (it does exec-replace on POSIX, so
// child.kill() alone already works there), leaving the real dev server orphaned and
// still holding the port. Killing the whole tree is what actually frees PORT.
function stopDevServer(child) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
  } else {
    child.kill();
  }
}

// Matches nativeModules.integration.test.tsx's own mock shapes for catalog-ui's API
// calls — reused verbatim rather than guessed, since that test already proved these
// correct against the real published package.
function catalogApiBody(url) {
  if (/\/tags$/.test(url)) return { tags: [] };
  if (/\/(datasets|code|dashboards)(\?|$)/.test(url)) return { items: [], total: 0, limit: 25, offset: 0 };
  return [];
}

async function mockNetwork(page) {
  await page.route(`${ISSUER}/.well-known/openid-configuration`, (route) =>
    route.fulfill(
      jsonResponse({
        authorization_endpoint: `${ISSUER}/authorize`,
        token_endpoint: `${ISSUER}/token`,
        jwks_uri: `${ISSUER}/jwks`,
      }),
    ),
  );
  await page.route(`${ISSUER}/token`, (route) =>
    route.fulfill(jsonResponse({ access_token: "fake-token", expires_in: 3600, token_type: "Bearer" })),
  );

  await page.route("**/api/me", (route) =>
    route.fulfill(
      jsonResponse({
        subject: "user-1",
        email: "phone-smoke@acme-analytics.example.com",
        memberships: [{ workspace: "acme-analytics", role: "owner" }],
      }),
    ),
  );

  await page.route("**/api/modules", (route) => {
    if (!route.request().url().includes("/api/modules/")) {
      return route.fulfill(
        jsonResponse([
          { id: "catalog", displayName: "Catalog", version: "0.1.0", hasOwnUi: true, navGroup: "view", navPath: "/catalog" },
          {
            id: "streamlit-demo",
            displayName: "Demo App",
            version: "0.1.0",
            hasOwnUi: true,
            navGroup: "view",
            navPath: "/streamlit-demo",
            uiIntegrationMode: "iframe-proxy",
          },
        ]),
      );
    }
    return route.continue();
  });

  await page.route("**/api/modules/*/iframe-url*", (route) => route.fulfill(jsonResponse({ url: "/__stub-iframe-target" })));
  await page.route("**/__stub-iframe-target", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body style='margin:0;min-height:100vh;background:#222'>stub Streamlit-shaped iframe target</body></html>",
    }),
  );

  await page.route("**/modules/catalog/**", (route) => route.fulfill(jsonResponse(catalogApiBody(route.request().url()))));
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

async function assertNoOverflow(page, label) {
  if (await hasHorizontalOverflow(page)) {
    throw new Error(`horizontal page scroll at ${label} (${page.viewportSize()?.width}px)`);
  }
}

async function openDrawerAndClick(page, linkName) {
  await page.getByRole("button", { name: "Open navigation" }).click();
  // A module's own link also carries its chip's two-letter initials as visible text
  // right next to the label (NavSection's ModuleChip) -- a regex match on the label
  // alone is robust to however browsers concatenate that into the link's accessible
  // name, where an exact match would be brittle.
  await page
    .getByRole("dialog")
    .getByRole("link", { name: new RegExp(linkName) })
    .click();
}

async function runPass(browser, { width, height, theme }) {
  const label = `${width}x${height} ${theme}`;
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
  await context.addInitScript((t) => localStorage.setItem("booth-design-theme", t), theme);
  const page = await context.newPage();
  await mockNetwork(page);

  await page.addInitScript(
    ({ state, verifier, returnTo }) => {
      sessionStorage.setItem("booth-design-pkce-state", state);
      sessionStorage.setItem("booth-design-pkce-verifier", verifier);
      sessionStorage.setItem("booth-design-pkce-return-to", returnTo);
    },
    { state: "fake-state", verifier: "fake-verifier", returnTo: "/" },
  );

  await page.goto(`${BASE_URL}/?code=fake-code&state=fake-state`);
  await page.getByRole("button", { name: "Open navigation" }).waitFor();
  await assertNoOverflow(page, `${label} / Home`);
  console.log(`  ok: Home (${label})`);

  // Open/close independent of navigation first (Esc), on the route we're already on —
  // clicking "Home" again here would never change the path, so the drawer's
  // close-on-route-change effect wouldn't fire and this would hang waiting for it.
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });

  await openDrawerAndClick(page, "Catalog");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.waitForURL("**/catalog");
  await assertNoOverflow(page, `${label} / Catalog`);
  console.log(`  ok: Catalog (${label})`);

  await openDrawerAndClick(page, "Demo App");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.waitForURL("**/streamlit-demo");
  await page.frameLocator("iframe[title='Demo App']").locator("body").waitFor();
  await assertNoOverflow(page, `${label} / Streamlit app`);
  console.log(`  ok: Streamlit app (${label})`);

  await openDrawerAndClick(page, "Home");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.waitForURL(`${BASE_URL}/`);
  await assertNoOverflow(page, `${label} / Home (after drawer nav back)`);

  await context.close();
}

async function main() {
  const server = startDevServer();
  try {
    await waitForServer(server);
    const browser = await chromium.launch();
    try {
      for (const width of [390, 768]) {
        for (const theme of ["light", "dark"]) {
          const height = width === 390 ? 844 : 1024;
          console.log(`--- ${width}x${height} ${theme} ---`);
          await runPass(browser, { width, height, theme });
        }
      }
    } finally {
      await browser.close();
    }
    console.log("\nPASS: no horizontal page scroll on any in-scope screen, any width/theme checked.");
  } finally {
    stopDevServer(server);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
