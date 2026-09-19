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

  describe("adminNavPath entries (ADR 0023)", () => {
    const storage = module({
      id: "storage",
      displayName: "Storage",
      navPath: "/storage",
      adminNavPath: "/storage/admin",
    });

    it("renders an admin link for owners", () => {
      render(
        <MemoryRouter>
          <NavSection label="Manage" icon={null} modules={[storage]} isOwner />
        </MemoryRouter>,
      );
      expect(screen.getByRole("link", { name: /Storage admin/ })).toHaveAttribute("href", "/storage/admin");
    });

    it("renders no admin link for non-owners, even if the module declares one", () => {
      render(
        <MemoryRouter>
          <NavSection label="Manage" icon={null} modules={[storage]} isOwner={false} />
        </MemoryRouter>,
      );
      expect(screen.queryByRole("link", { name: /Storage admin/ })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "ST Storage" })).toBeInTheDocument();
    });

    it("renders no admin link for modules that don't declare adminNavPath", () => {
      render(
        <MemoryRouter>
          <NavSection
            label="Manage"
            icon={null}
            modules={[module({ id: "logging", displayName: "Logging", navPath: "/logging" })]}
            isOwner
          />
        </MemoryRouter>,
      );
      expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument();
    });

    it("highlights only the admin entry, not the parent module, on the admin route", () => {
      render(
        <MemoryRouter initialEntries={["/storage/admin"]}>
          <NavSection label="Manage" icon={null} modules={[storage]} isOwner />
        </MemoryRouter>,
      );
      expect(screen.getByRole("link", { name: /Storage admin/ })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: "ST Storage" })).not.toHaveAttribute("aria-current");
    });
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
