# Design note: project picker, contextual help & docs, pipeline editor layout

Status: **draft, for coordinator review.** No code except §2a's tooltip primitive (built now, per explicit instruction — other modules are waiting on the pattern). Everything else here is note-only until reviewed.

Sources: ADR 0124 (projects), `agent-briefs/ux-feedback-2026-10-24.md` items 1, 2, 5, 7, 8.

---

## 1. Project picker (ADR 0124)

### Where it lives

ADR 0124 point 6 says "a dropdown in the persistent shell header." This shell has no top header bar today — the only persistent chrome is `NavRail` (`src/components/nav/NavRail.tsx`), which already carries `WorkspaceSwitcher` at the top. Adding a real header row would mean a new `ShellLayout` region and touching every pane's height assumptions (`NativeModulePane`, `IframeProxyPane`) for no functional gain, since `NavRail` is already visible on every page. Per "easiest-to-implement wins," I'm proposing a new `ProjectSwitcher` component placed directly below `WorkspaceSwitcher` in `NavRail`, not a new header bar. Functionally this satisfies "reachable from pretty much everywhere"; it just isn't literally a top bar. Flagging as **open question 1** in case a literal header is wanted regardless.

### Component

Same `DropdownMenu` primitive `WorkspaceSwitcher` already uses, extended for a tree instead of a flat list (ADR point 5 caps nesting at two levels, so this stays simple):

- **"All projects"** always first, acting as the cleared/default filter.
- Then each parentless project as its own row, followed by its children indented one step. A parent row is itself selectable (point 5: "selecting a node includes its children").
- Archived projects (point 2) are hidden from the picker entirely — archiving hides, never deletes, so archived projects' resources stay visible under whatever grouping a module already shows, but you can't newly scope *to* an archived project.
- Optional `color`/`icon` (point 2) render as a small dot before the name, same visual slot `StatusBadge`'s `dot` prop already uses.

Backing data: `GET /api/v1/projects` (ADR point 7) — needs a new `listProjects()` in `src/lib/api/client.ts`, same shape as `listModules()`. The exact response shape is core's design note's call, not decided here; this note assumes `{slug, name, parent, description, color, icon}` per the ADR's field list. **Open question 2:** confirm this shape once core's note exists (none written yet as of this note).

### Empty / "No project" state

ADR point 3: unassigned resources appear under "No project." This only applies to the **"All projects"** view, where a module groups its list with collapsible headings and "No project" is one of them — rendered last and visually muted (it's the common case today, nothing is tagged yet, but it shouldn't read as the primary section). When a *specific* project is selected, unassigned resources have no membership in it and so don't appear — the filter narrows to that project (+ children), full stop. The ADR doesn't say this explicitly but it's the only reading consistent with "a project only changes how lists are grouped and filtered."

### URL + localStorage mechanics

New: `?project=<slug>` is the source of truth while the shell is mounted; the per-user remembered value lives in `localStorage` (new key, `booth-design-active-project`) as the seed for a session with no `project` param yet. On first load: if the URL has no `project` param, read the remembered value (including an explicit "the user last chose All projects" state, not just "no remembered value") and write it into the URL via `history.replace` (no new back-button entry) so the URL becomes shareable going forward. Picking a project from `ProjectSwitcher` updates the URL param via `replace` (switching project while staying on the same page is filter state, not navigation) and mirrors it to `localStorage`. "All projects" removes the param entirely rather than storing an empty string, for clean URLs.

Unlike `useTheme()`'s module-level `useSyncExternalStore` pattern (needed because theme must stay in sync across consumers with no shared render tree guarantee), every consumer here — `NavRail`, `NativeModulePane`, `IframeProxyPane` — already renders under the same `<BrowserRouter>`, so a thin `useActiveProject()` built on react-router's own `useSearchParams()` is sufficient: it already shares state across all of them for free. The hook just adds the `localStorage` mirror and the "All projects" clearing behavior on top.

### Reaching native modules

Additive, optional prop on the existing contract (ADR 0031/0033): `project?: string` alongside `workspace`, `role`, `theme`, `getAccessToken` in `NativeModulePane`. A module that doesn't destructure it is unaffected, matching ADR point 6's "a module that has not adopted it ignores it and shows everything." This needs a `contracts/ui-integration.md` bump — additive/non-breaking, but still a contract change, not booth-design's to declare unilaterally.

### Reaching iframe-proxied modules

This is the one piece ADR point 6 explicitly left to this note. Two options:

1. **Query string on the proxied URL.** Simple, but `IframeProxyPane` already keys the iframe's `key={url}` to force a full remount on URL change — deliberately avoided for theme (ADR 0075) because it would drop live embedded state (an open notebook, an in-progress Superset edit). Changing `project` on every switch would hit the same problem, and project-switching is meant to be frequent ("reachable from pretty much everywhere").
2. **postMessage, mirroring the exact `booth:theme` precedent.** A new `booth:project` message type, posted on the existing `booth:iframe-ready` handshake and again whenever the selection changes — same origin-checked, same-origin-by-construction channel already in `IframeProxyPane.tsx`. No remount, no lost state.

**Recommending (2)**, for the same reason ADR 0075 chose it for theme. Caveat: adoption is cooperative — the embedded page's own JS has to listen and self-filter, and that JS isn't booth-design's to write for third-party embeds (Superset, JupyterHub, a module's own iframe-proxy UI). **Open question 3:** this needs sign-off from whoever owns each iframe-proxied module's embedded code, not just booth-design.

---

## 2. Contextual help & Docs

### 2a. Tooltip pattern — built now

Added `src/components/ui/Tooltip.tsx` (thin `@radix-ui/react-tooltip` wrapper, same style as `DropdownMenu.tsx`) and `src/components/ui/HelpHint.tsx` (the "?" affordance: a small round button showing `label` in a tooltip on hover or keyboard focus, built on `Tooltip`). See the tooltip PR for the actual component. Radix wires focus/hover/Escape-to-dismiss and `aria-describedby` automatically — no custom keyboard handling needed.

**How a module supplies help text.** Each module UI package is a separately built bundle (ADR 0097) — booth-design's component library isn't importable from them any more than `DataTable` or `StatusBadge` are today. So this isn't a shared import; it's a markup spec a module replicates in its own codebase against the same design tokens every module already uses:

```html
<button type="button" aria-label="<the help text, or a more specific label>"
        class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full
               text-text-muted outline-none hover:text-text focus-visible:ring-2">
  <!-- 14x14 circle-question icon -->
</button>
<!-- Radix Tooltip (or an equivalent) on hover/focus, role="tooltip":
     rounded-md border border-border bg-bg-elevated px-2.5 py-1.5 text-[12px] text-text shadow-lg -->
```

This is the spec booth-database and others can build against now, independent of §2b.

**Not built now** (follow-up, once this note is reviewed): wiring a `labelHint`/`headerHint` slot into `Field` and `DataTableColumn` so the shell's own pages can attach one without hand-composing it at every call site.

### 2b. Docs sidebar (note only)

New `NavRail` entry, "below the module groups" per the brief — i.e. after the Build/View/Manage `NavSection`s, before the bottom `mt-auto` block (theme toggle/Settings/user menu). Opens `/docs`: one section per module that supplies docs, a reading pane rendering that module's markdown client-side, a search box (client-side text search over the already-loaded markdown — docs are small, no need for a backend index), and deep links shaped `/docs/{moduleId}#{heading-slug}` for "?" affordances to point at later.

**What core must serve.** Reuses the existing module-proxy mechanism (`contracts/module-manifest.md`) rather than inventing a new one:

1. A new optional manifest field, `docsPath` (string, URL path) — the well-known path a module serves its own docs markdown at, same shape as `healthCheckPath`.
2. Core includes `docsPath` in `ModuleSummary` from `GET /api/modules`, same as it already does for `adminNavPath`.
3. No new proxy route: `/modules/{id}/{docsPath}` is just another path through core's existing authenticated module proxy (not `publicRoutes` — docs are for signed-in workspace members, not the public internet).

A module that omits `docsPath` simply has no Docs section, the same "absent field = feature off" pattern every other optional manifest field already follows.

**Open question 4:** should `HelpHint` grow an optional deep-link (a "Learn more" line under the tooltip text, pointing into `/docs/...`) once this exists? Left out of the built component for now — purely additive later, not something to block §2a's release on.

---

## 3. Pipeline editor layout

booth-pipeline is building a first compact pass with its own existing components and will send concrete requirements; this proposes the *pattern* to reconcile against, not a final layout. Same caveat as §2a: no shared component code crosses package boundaries, so this is a spec, not an import.

- **Collapsible panels.** Recommend the native `<details>/<summary>` element over a hand-rolled ARIA disclosure — free keyboard/AT support, styled to match (`border-border` panel, `bg-bg-elevated` header row, chevron rotates on `[open]`). Persist each panel's open/closed state per-id in `localStorage` so a user's layout survives reloads. Tradeoff to flag: `<details>` doesn't animate height by default; fine if booth-pipeline doesn't need a smooth collapse, worth confirming since they're sending their own requirements.
- **Sticky action bar.** A `sticky bottom-0` bar (not `fixed`, so it stays inside the editor's own scroll container rather than overlapping unrelated content) holding Save/Discard, elevated surface + top border + shadow matching existing tokens. Needs an explicit unsaved-state indicator (a dot/badge on the bar itself) per the UX feedback's "make unsaved state obvious" — the bar existing isn't enough on its own.
- **Expandable DAG canvas.** Default to a bounded height with an explicit expand/collapse toggle in the canvas's own corner, not a drag-resize handle — one persisted boolean is cheaper than persisted pixel sizing and plumbing pointer events. `@xyflow/react` (pipeline-ui's existing DAG library, per this repo's README on why its `dist/style.css` is still imported directly) likely already has its own fit-to-view behavior; this should sit on top of that, not duplicate it.
- Recommend the same `border-border`/`bg-bg-elevated`/`rounded-lg`/focus-visible-ring tokens already established elsewhere, so the result reads as one system even though it's a separate implementation.

**Open question 5:** final layout decisions should defer to whatever booth-pipeline's first compact pass and incoming requirements actually need — this is a starting proposal to reconcile against, not a spec to hold them to.

---

## Open questions, summarized

1. Literal top header bar vs. `NavRail` placement for the project picker (recommending `NavRail`).
2. Confirm `GET /api/v1/projects`'s exact response shape once core's design note exists.
3. postMessage project-sync needs sign-off from each iframe-proxied module's own embedded-code owner.
4. Should `HelpHint` later grow an optional deep link into Docs? Not needed for §2a's initial release.
5. Pipeline editor layout proposal is a starting point for reconciliation with booth-pipeline's own requirements, not a spec to hold them to.
