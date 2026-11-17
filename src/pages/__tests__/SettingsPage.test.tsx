import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsPage } from "../SettingsPage";
import type { Identity, Membership } from "@/lib/api/types";

let identity: Identity | null = null;
let activeWorkspace: Membership | null = null;
vi.mock("@/lib/session", () => ({ useSession: () => ({ identity, activeWorkspace }) }));
vi.mock("@/lib/theme", () => ({ useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }) }));
vi.mock("@/lib/auth/authClient", () => ({ logout: vi.fn() }));

describe("SettingsPage", () => {
  // docs/mobile.md / the mobile screen-pass audit: a long email forced the profile
  // row wider than its card, and with html/body now `overflow: hidden` (step 3), that
  // pushed Log out off-screen and unreachable instead of just causing a scrollbar —
  // only reproduces with a genuinely long value, a short one wouldn't have caught it.
  it("keeps Log out reachable at a narrow width even with a very long email", () => {
    identity = {
      subject: "user-1",
      email: "a.genuinely.long.email.address.for.this.workspace@acme-analytics-corp.example.com",
      memberships: [{ workspace: "acme-analytics", role: "owner" }],
    };
    activeWorkspace = { workspace: "acme-analytics", role: "owner" };

    render(<SettingsPage />);

    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.getByText(identity.email)).toHaveClass("truncate");
  });

  it("renders with no identity at all (loading/zero-workspace edge case)", () => {
    identity = null;
    activeWorkspace = null;
    render(<SettingsPage />);
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });
});
