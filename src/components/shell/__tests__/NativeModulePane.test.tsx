import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NativeModulePane } from "../NativeModulePane";
import { registerNativeModule } from "@/lib/nativeModules";
import type { Membership, ModuleSummary } from "@/lib/api/types";

const mockActiveWorkspace: Membership = { workspace: "acme-analytics", role: "editor" };

vi.mock("@/lib/session", () => ({
  useSession: () => ({ activeWorkspace: mockActiveWorkspace }),
}));

function module(overrides: Partial<ModuleSummary>): ModuleSummary {
  return { id: "mod", displayName: "Mod", version: "0.1.0", hasOwnUi: true, ...overrides };
}

describe("NativeModulePane", () => {
  it("passes the ADR 0030 prop contract (workspace, role, theme) to a registered component", () => {
    registerNativeModule("wired-mod", ({ workspace, role, theme }) => (
      <div>
        {workspace}/{role}/{theme}
      </div>
    ));
    render(<NativeModulePane module={module({ id: "wired-mod", displayName: "Wired" })} />);
    expect(screen.getByText(/acme-analytics\/editor\//)).toBeInTheDocument();
  });

  it("falls back to a placeholder when nothing is registered for this module id", () => {
    render(<NativeModulePane module={module({ id: "unwired-mod", displayName: "Unwired" })} />);
    expect(screen.getByText("Unwired")).toBeInTheDocument();
    expect(screen.getByText(/aren't wired into the shell yet/)).toBeInTheDocument();
  });
});
