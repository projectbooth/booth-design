import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ShellLayout } from "../ShellLayout";

const isDesktop = vi.fn();
vi.mock("@/lib/useIsDesktop", () => ({ useIsDesktop: () => isDesktop() }));
vi.mock("@/components/nav/NavRail", () => ({ NavRail: () => <div data-testid="nav-rail" /> }));
vi.mock("@/components/nav/MobileNav", () => ({ MobileNav: () => <div data-testid="mobile-nav" /> }));

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<ShellLayout />}>
          <Route path="/" element={<div data-testid="page">page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ShellLayout", () => {
  it("mounts NavRail, not MobileNav, at desktop widths", () => {
    isDesktop.mockReturnValue(true);
    renderShell();
    expect(screen.getByTestId("nav-rail")).toBeInTheDocument();
    expect(screen.queryByTestId("mobile-nav")).not.toBeInTheDocument();
    expect(screen.getByTestId("page")).toBeInTheDocument();
  });

  it("mounts MobileNav, not NavRail, below the desktop breakpoint — never both (ADR 0005)", () => {
    isDesktop.mockReturnValue(false);
    renderShell();
    expect(screen.getByTestId("mobile-nav")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-rail")).not.toBeInTheDocument();
    expect(screen.getByTestId("page")).toBeInTheDocument();
  });
});
