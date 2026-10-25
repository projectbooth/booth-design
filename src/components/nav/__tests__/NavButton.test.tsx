import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { NavButton } from "../NavButton";

describe("NavButton", () => {
  it("preserves the current ?project= when linking to a different route (ADR 0124)", () => {
    render(
      <MemoryRouter initialEntries={["/pipeline?project=nfl"]}>
        <NavButton to="/storage" icon={null}>
          Storage
        </NavButton>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/storage?project=nfl");
  });

  it("links to a bare path when there's nothing to preserve", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <NavButton to="/store" icon={null}>
          Module Store
        </NavButton>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/store");
  });
});
