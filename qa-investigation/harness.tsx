import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { NativeModulePane } from "@/components/shell/NativeModulePane";
import { SessionProvider } from "@/lib/session";
import { setTokenState } from "@/lib/auth/tokenStore";
import type { ModuleSummary } from "@/lib/api/types";
import "../src/nativeModuleRegistrations";
import "../src/styles/index.css";

// INVESTIGATION-ONLY harness -- see harness.html. Fixture shapes mirror
// src/__tests__/nativeModules.integration.test.tsx's real-package integration test,
// reused here so a real browser exercises the exact same contract that test already
// pins in jsdom, just with a real CSS cascade jsdom doesn't have.

const params = new URLSearchParams(window.location.search);
const modId = params.get("mod") ?? "storage";
const path = params.get("path") ?? "/storage";
// data-theme is set by harness.html's inline script, before this module graph (which
// transitively imports theme.ts) ever evaluates -- setting it here would be too late.

window.history.replaceState({}, "", path);

setTokenState({ accessToken: "harness-token", expiresAt: Date.now() + 60_000 });

// All network mocking happens at the Playwright page.route layer (see screenshot.mjs),
// not here -- this harness only sets up app-level state (token, route, theme).

const mod: ModuleSummary = { id: modId, displayName: modId, version: "0.1.0", hasOwnUi: true };

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <div className="h-screen w-screen bg-bg">
          <NativeModulePane module={mod} />
        </div>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
