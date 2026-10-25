import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProjectSwitcher } from "../ProjectSwitcher";
import type { ProjectSummary } from "@/lib/api/types";

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

  it("lists a two-level tree: a parent row, then its children indented beneath it", async () => {
    projectsState = {
      projects: [
        project({ slug: "finance", name: "Finance" }),
        project({ slug: "finance-dev", name: "Finance (dev)", parent: "finance" }),
        project({ slug: "finance-prod", name: "Finance (prod)", parent: "finance" }),
        project({ slug: "nfl", name: "NFL" }),
      ],
      loading: false,
      error: null,
    };
    renderSwitcher();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));

    expect(screen.getByText("All projects")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.getByText("Finance (dev)")).toBeInTheDocument();
    expect(screen.getByText("Finance (prod)")).toBeInTheDocument();
    expect(screen.getByText("NFL")).toBeInTheDocument();
  });

  it("never lists an archived project", async () => {
    projectsState = {
      projects: [project({ slug: "old", name: "Old Project", archived: true })],
      loading: false,
      error: null,
    };
    renderSwitcher();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    expect(screen.queryByText("Old Project")).toBeNull();
  });

  it("picking a project updates the URL and the trigger's label", async () => {
    projectsState = { projects: [project({ slug: "nfl", name: "NFL" })], loading: false, error: null };
    renderSwitcher();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("NFL"));
    expect(screen.getByRole("button")).toHaveTextContent("NFL");
  });

  it("shows a muted note instead of hiding the picker when the list fails to load", async () => {
    projectsState = { projects: [], loading: false, error: "core unreachable" };
    renderSwitcher();
    expect(screen.getByRole("button")).toHaveTextContent("All projects");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    expect(screen.getByText(/Projects couldn't be listed/)).toBeInTheDocument();
  });
});
