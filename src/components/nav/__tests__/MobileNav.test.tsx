import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { MobileNav } from "../MobileNav";

// Covers the drawer's own mechanics (open, close, focus, route change) — not the nav
// content inside it, which NavSection/NavButton/ProjectSwitcher/WorkspaceSwitcher each
// already cover on their own. Deliberately never drives the open state via a simulated
// tap on the hamburger trigger: this project's own experience with Tooltip/HelpHint and
// ProjectSwitcher is that simulating a Radix primitive open via pointer events hangs
// under CI's parallel run, so `defaultOpen` (the same seam those components use) is
// what gets the drawer open here.
// The mock itself includes a "navigate" button, standing in for a real nav link
// inside the drawer (NavButton, which has its own tests) — it must be inside what
// MobileNav renders, not a sibling, since Radix Dialog aria-hides everything outside
// the dialog while it's open, which would make an outside trigger unreachable by role
// queries (and rightly so: that's the focus trap working).
vi.mock("../NavRailContent", () => ({
  NavRailContent: () => {
    const navigate = useNavigate();
    return (
      <div data-testid="nav-content">
        nav content
        <button onClick={() => navigate("/elsewhere")}>go elsewhere</button>
      </div>
    );
  },
}));

function renderAt(path: string, defaultOpen = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<MobileNav defaultOpen={defaultOpen} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MobileNav", () => {
  it("is closed by default, showing only the top bar's trigger", () => {
    renderAt("/");
    expect(screen.getByRole("button", { name: "Open navigation" })).toBeInTheDocument();
    expect(screen.queryByTestId("nav-content")).not.toBeInTheDocument();
  });

  it("renders the drawer's nav content when open", () => {
    renderAt("/", true);
    expect(screen.getByTestId("nav-content")).toBeInTheDocument();
  });

  it("moves focus into the drawer when it opens", () => {
    renderAt("/", true);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderAt("/", true);
    expect(screen.getByTestId("nav-content")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("nav-content")).not.toBeInTheDocument();
  });

  it("closes via its own close button", async () => {
    const user = userEvent.setup();
    renderAt("/", true);
    await user.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(screen.queryByTestId("nav-content")).not.toBeInTheDocument();
  });

  it("closes when the route changes while it's open", async () => {
    const user = userEvent.setup();
    renderAt("/", true);
    expect(screen.getByTestId("nav-content")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "go elsewhere" }));
    expect(screen.queryByTestId("nav-content")).not.toBeInTheDocument();
  });

  it("does not immediately close itself when mounted already open on a route", () => {
    renderAt("/", true);
    expect(screen.getByTestId("nav-content")).toBeInTheDocument();
  });
});
