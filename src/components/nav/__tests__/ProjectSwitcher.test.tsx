import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProjectSwitcher } from "../ProjectSwitcher";
import type { ProjectSummary } from "@/lib/api/types";

// Deliberately not exercising the open dropdown menu here: driving a Radix Popper/Menu
// open via simulated pointer events is slow and, in this project's own experience fixing
// the same class of problem for Tooltip/HelpHint, outright hangs under CI's parallel test
// run. The tree-filtering logic this menu renders is covered directly and reliably in
// src/lib/__tests__/projectTree.test.ts instead; this file only covers what's actually
// ProjectSwitcher's own: the trigger's label and the always-visible error note.
let projectsState: { projects: ProjectSummary[]; loading: boolean; error: string | null } = {
  projects: [],
  loading: false,
  error: null,
};
vi.mock("@/lib/useProjects", () => ({ useProjects: () => projectsState }));

function project(overrides: Partial<ProjectSummary>): ProjectSummary {
  return { slug: "nfl", name: "NFL", ...overrides };
}

function renderSwitcher(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ProjectSwitcher />
    </MemoryRouter>,
  );
}

describe("ProjectSwitcher", () => {
  it("shows a loading placeholder, not the trigger, while the list is loading", () => {
    projectsState = { projects: [], loading: true, error: null };
    renderSwitcher();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("defaults the trigger to All projects with no selection", () => {
    projectsState = { projects: [project({ slug: "nfl", name: "NFL" })], loading: false, error: null };
    renderSwitcher();
    expect(screen.getByRole("button")).toHaveTextContent("All projects");
  });

  it("shows the active project's name in the trigger when one is selected via the URL", () => {
    projectsState = { projects: [project({ slug: "nfl", name: "NFL" })], loading: false, error: null };
    renderSwitcher("/?project=nfl");
    expect(screen.getByRole("button")).toHaveTextContent("NFL");
  });

  it("falls back to All projects if the URL names a project that doesn't exist (or is archived)", () => {
    projectsState = {
      projects: [project({ slug: "old", name: "Old", archived: true })],
      loading: false,
      error: null,
    };
    renderSwitcher("/?project=old");
    expect(screen.getByRole("button")).toHaveTextContent("All projects");
  });

  it("shows a load failure as a note next to the trigger, without hiding the picker", () => {
    projectsState = { projects: [], loading: false, error: "core unreachable" };
    renderSwitcher();
    expect(screen.getByRole("button")).toHaveTextContent("All projects");
    expect(screen.getByText(/Projects couldn't be listed/)).toBeInTheDocument();
  });

  it("shows no error note once the list loads successfully", () => {
    projectsState = { projects: [project({ slug: "nfl", name: "NFL" })], loading: false, error: null };
    renderSwitcher();
    expect(screen.queryByText(/couldn't be listed/)).toBeNull();
  });
});
