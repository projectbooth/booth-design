import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { NavSection } from "../NavSection";
import type { ModuleSummary } from "@/lib/api/types";

function module(overrides: Partial<ModuleSummary>): ModuleSummary {
  return { id: "mod", displayName: "Mod", version: "0.1.0", hasOwnUi: true, ...overrides };
}

describe("NavSection", () => {
  it("renders nothing when the section has no modules", () => {
    const { container } = render(
      <MemoryRouter>
        <NavSection label="Build" modules={[]} icon={null} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one link per module, labeled by displayName", () => {
    render(
      <MemoryRouter>
        <NavSection
          label="Build"
          icon={null}
          modules={[
            module({ id: "pipeline", displayName: "Pipelines", navPath: "/pipeline" }),
            module({ id: "notebooks", displayName: "Notebooks", navPath: "/notebooks" }),
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Build")).toBeInTheDocument();
    const pipelines = screen.getByRole("link", { name: /Pipelines/ });
    expect(pipelines).toHaveAttribute("href", "/pipeline");
    expect(screen.getByRole("link", { name: /Notebooks/ })).toHaveAttribute("href", "/notebooks");
  });

  it("falls back to /<id> when navPath is missing", () => {
    render(
      <MemoryRouter>
        <NavSection label="Build" icon={null} modules={[module({ id: "storage", displayName: "Storage" })]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /Storage/ })).toHaveAttribute("href", "/storage");
  });
});
