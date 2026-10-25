# Design note: project picker, contextual help & docs, pipeline editor layout

Status: **accepted in principle, one question outstanding.** §0's package approach, and §1's picker wiring, are accepted. §0's second obligation (originally: a module needs its own `TooltipProvider` to work around per-module Context duplication) turned out to be answered differently than first drafted — see the second revision note below. This PR stays open until that's confirmed read; §2a's tooltip primitive (PR #48) and §0's actual `@projectbooth/design-ui` package (PR #49, `design-ui/` in this repo) are both built. Everything else here (§2b, §3) is still note-only.

Sources: ADR 0124 (projects), `agent-briefs/ux-feedback-2026-10-24.md` items 1, 2, 5, 7, 8; booth-pipeline's `docs/decisions/0004-ui-component-library.md`; the merged `contracts/projects.md` and the "Project selection" section added to `contracts/ui-integration.md`.

**Revision, 2026-10-25:** added §0 (shared component package — booth-pipeline's finding that no module can actually import booth-design's components today, confirmed independently against `contracts/ui-integration.md`'s own "built on booth-design's shared component library" line). Updated §1's "Reaching native modules" and "Reaching iframe-proxied modules" to match the now-merged `contracts/projects.md` contract, replacing what were previously this note's own proposals — core's design note landed and the coordinator ruled on it after this note's first draft. Original open questions 2 and 3 are resolved below; everything else is unchanged from the first draft.

**Revision 2, 2026-10-25:** §0's second obligation, as first drafted, was wrong about *why* a per-module `TooltipProvider` is needed. Checked whether `react`/`@radix-ui/*` can be externalized as peer dependencies resolved to the shell's single copy, the same way `react`/`react-dom` already are in every `@projectbooth/*-ui` module's own build (confirmed directly against a real built module's `dist/index.js`: a literal, unresolved `import ... from "react"` survives, deferred to booth-design's own final build, which is the only place it actually resolves). Extending that same mechanism to `@radix-ui/react-tooltip` works identically — verified in `design-ui/vite.config.ts` (PR #49): the published package's own `dist/index.js` keeps `@radix-ui/react-tooltip` unresolved too. **There is no per-module-Context-duplication problem to work around.** A consuming module still mounts its own `TooltipProvider`, but only because Radix requires *some* provider in the tree — the same reason any app using Radix needs one, not a Context-sharing workaround. §0 below is corrected accordingly. `@projectbooth/design-ui` v0.1.0 ships `Tooltip`/`HelpHint` only (not the fuller list originally sketched here) — small, and the one thing actually blocking other modules right now; more primitives follow once something concretely needs them.

---

## 0. Shared component package

Two independent findings point at the same gap. `contracts/ui-integration.md` already says native-mode modules are "built on `booth-design`'s shared component library" — but `@booth/design`'s `package.json` is `"private": true` and exports nothing; `booth-catalog`, `booth-storage`, `booth-module-store` and `booth-pipeline` each hand-rolled their own local primitives against the same Tailwind/OKLCH tokens instead (booth-pipeline's `docs/decisions/0004-ui-component-library.md`, flagged 2026-09-21 and never resolved — asking for exactly this: either publish `@projectbooth/design-ui`, or confirm duplication is the intended v0 answer). This matters now because §2a's `HelpHint`, and §3's sticky action bar / collapsible panel, only help if a module can actually `npm install` them rather than hand-copy a markup spec.

**Package — built (PR #49, `design-ui/` in this repo).** `src/components/ui/` stays the one canonical source; `design-ui/scripts/sync-source.mjs` copies the files `design-ui/src/index.ts` actually re-exports into a gitignored `src/vendor/` before every build, and a second Vite library-mode build (`design-ui/vite.config.ts`) packages that into a publishable `dist/`, alongside the existing app build. No second repo, no monorepo migration. The shell app keeps importing `@/components/ui/*` locally, unchanged; the published package is built from the identical source, so there is exactly one copy to drift. Publishes via `.github/workflows/design-ui-publish.yml` on a `design-ui-v*` tag, mirroring every module's own `publish.yml`.

**What ships in v0.1.0: `Tooltip`/`HelpHint` only** — small, and the one thing actually blocking other modules right now. `Button`, `Field`, `Input`, `Select`, `Switch`, `DropdownMenu`, `DataTable`, `StatusBadge`, `Avatar`, the icon set, and a Tailwind preset (exporting the `theme.extend.colors` block and the `darkMode: ["selector", '[data-theme="dark"]']` strategy, so a module's own `tailwind.config.ts` could write `presets: [require("@projectbooth/design-ui/tailwind-preset")]` instead of hand-copying it, which is today's actual, undocumented convention) are **not** sketched ahead of demand — they follow once a module concretely needs one, the same discipline this note tries to hold itself to elsewhere. Also not in scope, ever: `NavRail`, `WorkspaceSwitcher`, `ShellLayout`, `SessionProvider`, `useTheme`/`useSession` — app-level routing/auth/layout, not reusable presentational pieces; a module already receives `theme` as a prop via the existing `{workspace, role, theme, getAccessToken}` contract without needing the hook itself.

**Versioning and consumption.** Same exact-pin convention every `@projectbooth/*-ui` dependency in this repo's own `package.json` already follows (e.g. `"@projectbooth/pipeline-ui": "1.5.0"`, no caret) — a module adds `@projectbooth/design-ui` as a normal dependency and pins it exactly, bumping by hand like any other. No lockstep requirement: ADR 0097 already means each module bundles its own compiled output independently, and the shell's Tailwind content glob just scans literal class-name strings in each module's `dist/*.js` regardless of which `design-ui` version produced them — so different modules can sit on different `design-ui` versions simultaneously with no conflict, the same tolerance that already exists for `pipeline-ui` 1.5.0 and `storage-ui` 0.1.2 coexisting in this shell today.

**One real obligation this adds for a consuming module**, alongside this repo's existing "Native module UI package obligations" (`README.md`): **add `node_modules/@projectbooth/design-ui/dist/**/*.js` to the module's own Tailwind `content` glob**, not just its own `src/`. `HelpHint`'s classes ship inside `design-ui`'s compiled output, not the consuming module's own source — a module's Tailwind build only generates CSS for classes it can find as literal strings in whatever its own `content` glob scans. Skipping this silently produces an unstyled button, not an error.

**The per-module-Provider question — corrected (Revision 2 above).** An earlier draft of this note claimed a module needs its own `TooltipProvider` to avoid a duplicated-Context problem, because each package bundles its own copy of `design-ui`'s compiled code including the Context object. **That premise was checked and is wrong.** `react`, `react-dom` and `@radix-ui/react-tooltip` are all `peerDependencies` of `design-ui`, externalized in its `vite.config.ts` — the identical mechanism every `@projectbooth/*-ui` module's own build already uses for `react`/`react-dom`. A consuming module's bundled `HelpHint` therefore resolves `@radix-ui/react-tooltip` (Context object included) against booth-design's own single installed copy at the shell's final build, the same as `react` itself already does. There is one Context instance across the whole app, shell included. A module still mounts its own `TooltipProvider` — that's just how Radix's `Tooltip` works in any app, not a workaround for anything specific to `design-ui`. (The merged `contracts/projects.md` having native modules read `?project=` off `window.location.search` rather than a shared hook is unrelated to this — that was never a Context-sharing problem, just the simpler design regardless.)

**Status:** booth-pipeline will send its own component requirements as a short note in its repo's docs — further primitives get added to `design-ui` once that lands and something concretely needs them.

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

Backing data: `GET /api/projects` (confirmed; `contracts/projects.md` drops the `v1` the ADR sketched) — needs a new `listProjects()` in `src/lib/api/client.ts`, same shape as `listModules()`. Response shape per the merged contract: `{slug, name, parent?, description?, color?, icon?, archived?}`. Archived projects (see above) are filtered out of the picker client-side using that `archived` field.

### Empty / "No project" state

ADR point 3: unassigned resources appear under "No project." This only applies to the **"All projects"** view, where a module groups its list with collapsible headings and "No project" is one of them — rendered last and visually muted (it's the common case today, nothing is tagged yet, but it shouldn't read as the primary section). When a *specific* project is selected, unassigned resources have no membership in it and so don't appear — the filter narrows to that project (+ children), full stop. The ADR doesn't say this explicitly but it's the only reading consistent with "a project only changes how lists are grouped and filtered."

### URL + localStorage mechanics

New: `?project=<slug>` is the source of truth while the shell is mounted; the per-user remembered value lives in `localStorage` (new key, `booth-design-active-project`) as the seed for a session with no `project` param yet. On first load: if the URL has no `project` param, read the remembered value (including an explicit "the user last chose All projects" state, not just "no remembered value") and write it into the URL via `history.replace` (no new back-button entry) so the URL becomes shareable going forward. Picking a project from `ProjectSwitcher` updates the URL param via `replace` (switching project while staying on the same page is filter state, not navigation) and mirrors it to `localStorage`. "All projects" removes the param entirely rather than storing an empty string, for clean URLs.

Unlike `useTheme()`'s module-level `useSyncExternalStore` pattern (needed because theme must stay in sync across consumers with no shared render tree guarantee), every consumer here — `NavRail`, `NativeModulePane`, `IframeProxyPane` — already renders under the same `<BrowserRouter>`, so a thin `useActiveProject()` built on react-router's own `useSearchParams()` is sufficient: it already shares state across all of them for free. The hook just adds the `localStorage` mirror and the "All projects" clearing behavior on top.

### Reaching native modules

**Resolved by the merged contract — simpler than this note first proposed.** No new prop, no `contracts/ui-integration.md` bump: `contracts/projects.md` has native-mode modules read `?project=<slug>` directly off `window.location.search`, not through a prop the shell passes. `window.location` is a plain browser API, the same object regardless of which package's bundle reads it — needs zero coordination with any native module's own package to adopt: a module that doesn't look at the query string keeps showing everything, exactly ADR point 6's fallback, with no contract change on either side. (Unrelated to §0's Context question — that's resolved differently, by externalizing the one Radix package involved, not by avoiding shared state the way this is.)

### Reaching iframe-proxied modules

**Resolved by the merged contract.** `GET /api/modules/{id}/iframe-url` now accepts an optional `?project=<slug>` that `IframeURLIssuer.URLFor` appends to the minted src; the shell re-requests the URL and re-points `IframeProxyPane`'s iframe (full remount, same `key={url}` mechanism already there) when the picker changes.

This is the opposite of what this note originally recommended here — a `postMessage` channel mirroring the exact `booth:theme` precedent, specifically to avoid the remount/lost-state problem ADR 0075 solved for theme. The coordinator's ruling on core's design note approved the query-string passthrough as the one core change instead, keeping `postMessage` live-update explicitly as an optional, no-core-change-needed follow-up. Noting the accepted consequence plainly rather than re-arguing a decided point: switching projects will reload any iframe-proxied module currently open (a live notebook, an in-progress Superset edit) — the same tradeoff ADR 0075 avoided for theme, accepted here instead.

---

## 2. Contextual help & Docs

### 2a. Tooltip pattern — built now

Added `src/components/ui/Tooltip.tsx` (thin `@radix-ui/react-tooltip` wrapper, same style as `DropdownMenu.tsx`) and `src/components/ui/HelpHint.tsx` (the "?" affordance: a small round button showing `label` in a tooltip on hover or keyboard focus, built on `Tooltip`). See the tooltip PR for the actual component. Radix wires focus/hover/Escape-to-dismiss and `aria-describedby` automatically — no custom keyboard handling needed.

**How a module supplies help text.** `import { HelpHint, TooltipProvider } from "@projectbooth/design-ui"` (see §0 — built, publishes once the `design-ui-v0.1.0` tag goes out) — mount a `TooltipProvider` around wherever `HelpHint` is used, same as any app using Radix's `Tooltip`. Until that tag is pushed, or for a module that would rather not take the dependency yet, the fallback is a markup spec a module replicates in its own codebase against the same design tokens every module already uses:

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

booth-pipeline is sending its own component requirements as a short note in its repo's docs (§0); this proposes the *pattern* to reconcile against once that lands, not a final layout. Unlike this note's original premise, these don't have to stay spec-only forever: once §0's `@projectbooth/design-ui` exists, a sticky action bar and a collapsible panel belong there as real shared components, not per-module reimplementations. Described below as a pattern either way — a spec to replicate now, a `design-ui` export once it ships.

- **Collapsible panels.** Recommend the native `<details>/<summary>` element over a hand-rolled ARIA disclosure — free keyboard/AT support, styled to match (`border-border` panel, `bg-bg-elevated` header row, chevron rotates on `[open]`). Persist each panel's open/closed state per-id in `localStorage` so a user's layout survives reloads. Tradeoff to flag: `<details>` doesn't animate height by default; fine if booth-pipeline doesn't need a smooth collapse, worth confirming since they're sending their own requirements.
- **Sticky action bar.** A `sticky bottom-0` bar (not `fixed`, so it stays inside the editor's own scroll container rather than overlapping unrelated content) holding Save/Discard, elevated surface + top border + shadow matching existing tokens. Needs an explicit unsaved-state indicator (a dot/badge on the bar itself) per the UX feedback's "make unsaved state obvious" — the bar existing isn't enough on its own.
- **Expandable DAG canvas.** Default to a bounded height with an explicit expand/collapse toggle in the canvas's own corner, not a drag-resize handle — one persisted boolean is cheaper than persisted pixel sizing and plumbing pointer events. `@xyflow/react` (pipeline-ui's existing DAG library, per this repo's README on why its `dist/style.css` is still imported directly) likely already has its own fit-to-view behavior; this should sit on top of that, not duplicate it.
- Recommend the same `border-border`/`bg-bg-elevated`/`rounded-lg`/focus-visible-ring tokens already established elsewhere, so the result reads as one system even though it's a separate implementation.

**Open question 5:** final layout decisions should defer to whatever booth-pipeline's first compact pass and incoming requirements actually need — this is a starting proposal to reconcile against, not a spec to hold them to.

---

## Open questions, summarized

1. Literal top header bar vs. `NavRail` placement for the project picker (recommending `NavRail`).
2. ~~Confirm `GET /api/projects`'s exact response shape~~ — **resolved**, `contracts/projects.md` merged.
3. ~~iframe project-sync mechanism~~ — **resolved**, query-string re-point on `iframe-url` approved by the coordinator's ruling; `postMessage` live-update stays an optional, no-core-change follow-up.
4. Should `HelpHint` later grow an optional deep link into Docs? Not needed for §2a's initial release.
5. Pipeline editor layout proposal is a starting point for reconciliation with booth-pipeline's own requirements, not a spec to hold them to — now tied to §0's `design-ui` package rather than staying spec-only indefinitely.
6. ~~`design-ui`'s exact build mechanism~~ — **resolved**, built (PR #49): a second Vite library-mode target, source synced from `../src` by `scripts/sync-source.mjs`.
7. ~~Does §0's v0 scope match what booth-pipeline needs?~~ — **moot**: v0.1.0 deliberately shipped `Tooltip`/`HelpHint` only, not the fuller list first sketched here; further primitives wait for a concrete need rather than trying to guess booth-pipeline's requirements ahead of their note.
8. **New (Revision 2):** `@projectbooth/design-ui` is built and its CI is green (PR #49) but not yet tagged/published — confirm this note's correction (no per-module-Context-duplication problem; peer-dep externalization works) is the thing actually being reviewed, then the `design-ui-v0.1.0` tag goes out.
