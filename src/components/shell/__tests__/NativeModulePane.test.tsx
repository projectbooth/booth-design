import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NativeModulePane } from "../NativeModulePane";
import { registerNativeModule, type NativeModuleProps } from "@/lib/nativeModules";
import { clearTokenState, getAccessToken, setTokenState } from "@/lib/auth/tokenStore";
import type { Membership, ModuleSummary } from "@/lib/api/types";

const mockActiveWorkspace: Membership = { workspace: "acme-analytics", role: "editor" };

vi.mock("@/lib/session", () => ({
  useSession: () => ({ activeWorkspace: mockActiveWorkspace }),
}));

function module(overrides: Partial<ModuleSummary>): ModuleSummary {
  return { id: "mod", displayName: "Mod", version: "0.1.0", hasOwnUi: true, ...overrides };
}

afterEach(() => {
  clearTokenState();
});

describe("NativeModulePane", () => {
  it("passes the ADR 0031/0033 prop contract (workspace, role, theme, getAccessToken) to a registered component", () => {
    registerNativeModule("wired-mod", ({ workspace, role, theme, getAccessToken }) => (
      <div>
        {workspace}/{role}/{theme}/{getAccessToken() ?? "no-token"}
      </div>
    ));
    render(<NativeModulePane module={module({ id: "wired-mod", displayName: "Wired" })} />);
    expect(screen.getByText(/^acme-analytics\/editor\/(dark|light)\/no-token$/)).toBeInTheDocument();
  });

  it("passes tokenStore's getAccessToken by reference, not a value captured at render time (ADR 0033)", () => {
    let passedFn: NativeModuleProps["getAccessToken"] | null = null;
    registerNativeModule("token-mod", (props) => {
      passedFn = props.getAccessToken;
      return <div>ok</div>;
    });

    render(<NativeModulePane module={module({ id: "token-mod", displayName: "Token" })} />);
    expect(passedFn).toBe(getAccessToken); // the exact same function, not a wrapper

    // Mutate the token *after* the render that captured passedFn — a stale captured
    // value would still report the old (empty) state, but a passed-through reference
    // always reads tokenStore's current module-level state on call.
    setTokenState({ accessToken: "fresh-token", expiresAt: Date.now() + 60_000 });
    expect(passedFn!()).toBe("fresh-token");
  });

  it("falls back to a placeholder when nothing is registered for this module id", () => {
    render(<NativeModulePane module={module({ id: "unwired-mod", displayName: "Unwired" })} />);
    expect(screen.getByText("Unwired")).toBeInTheDocument();
    expect(screen.getByText(/aren't wired into the shell yet/)).toBeInTheDocument();
  });

  it("wraps a registered component in the shell's own outer padding (ADR 0072)", () => {
    registerNativeModule("padded-mod", () => <div data-testid="mounted">content</div>);
    render(<NativeModulePane module={module({ id: "padded-mod", displayName: "Padded" })} />);
    const wrapper = screen.getByTestId("mounted").parentElement;
    expect(wrapper).toHaveClass("p-6");
  });
});
