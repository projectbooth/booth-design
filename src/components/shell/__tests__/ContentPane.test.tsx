import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContentPane } from "../ContentPane";
import type { ModuleSummary } from "@/lib/api/types";

vi.mock("../NativeModulePane", () => ({
  NativeModulePane: ({ module }: { module: ModuleSummary }) => <div>native:{module.id}</div>,
}));
vi.mock("../IframeProxyPane", () => ({
  IframeProxyPane: ({ module }: { module: ModuleSummary }) => <div>iframe-proxy:{module.id}</div>,
}));

function module(overrides: Partial<ModuleSummary>): ModuleSummary {
  return { id: "mod", displayName: "Mod", version: "0.1.0", hasOwnUi: true, ...overrides };
}

describe("ContentPane", () => {
  it("dispatches to NativeModulePane when uiIntegrationMode is native", () => {
    render(<ContentPane module={module({ id: "catalog", uiIntegrationMode: "native" })} />);
    expect(screen.getByText("native:catalog")).toBeInTheDocument();
  });

  it("dispatches to IframeProxyPane when uiIntegrationMode is iframe-proxy", () => {
    render(<ContentPane module={module({ id: "superset", uiIntegrationMode: "iframe-proxy" })} />);
    expect(screen.getByText("iframe-proxy:superset")).toBeInTheDocument();
  });

  it("falls back to native when uiIntegrationMode is absent", () => {
    render(<ContentPane module={module({ id: "no-mode", uiIntegrationMode: undefined })} />);
    expect(screen.getByText("native:no-mode")).toBeInTheDocument();
  });
});
