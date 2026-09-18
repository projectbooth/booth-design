# booth-design

The UI shell (persistent nav rail + main content pane), workspace switcher, and
shared component library every other `booth-*` module builds native pages on. Mandatory
foundation repo — see `../booth-architecture`'s `agent-briefs/design.md`, ADR 0005
(`contracts/ui-integration.md`), and ADR 0009.

## Stack

React + TypeScript + Vite, Radix UI primitives + Tailwind CSS (ADR 0009). No backend of
its own — `booth-core` hosts this shell and fronts its API calls through its gateway
(ARCHITECTURE.md §3); locally, Vite proxies `/api` to a `booth-core` instance
(`BOOTH_DESIGN_DEV_BACKEND`, defaults to `http://localhost:8080`).

## Repo layout

```
src/lib/api/          typed client + wire types for booth-core's actual /api/me,
                       /api/modules, /api/modules/{id}/iframe-url endpoints
src/lib/session.tsx    identity + active-workspace context (ADR 0025)
src/lib/manifest.ts    navGroup/uiIntegrationMode contract types + grouping logic
                       (contract tests live in src/lib/__tests__/manifest.test.ts)
src/lib/nativeModules.ts  mount-point registry for native-mode modules' own React
                       components — see "Open questions" below
src/lib/theme.ts       light/dark toggle (data-theme attribute)
src/styles/tokens.css  design tokens: placeholder-brand palette, spacing, typography
src/components/ui/     component library: Button, StatusBadge, DataTable, Input,
                       Select, Switch, Field, Avatar, DropdownMenu
src/components/nav/    NavRail, NavSection, NavButton, WorkspaceSwitcher
src/components/shell/  ShellLayout (persistent rail + content pane), ContentPane
                       (native vs. iframe-proxy dispatch), NativeModulePane,
                       IframeProxyPane
src/pages/             Home, Settings, Module Store slot, the dynamic module-route
                       resolver, and the zero-workspace onboarding state
```

## Running locally

```
npm install
npm run dev
# proxies /api to booth-core; without one running, the shell shows its
# "couldn't load your session" state rather than crashing
```

## Testing

Per `contracts/testing-strategy.md` / ADR 0024 — layers 1-2 only (see this repo's
`.github/workflows/ci.yml` for why there's no layer-3/helm job here):

```
npm run typecheck
npm run lint
npm test        # unit + contract tests
npm run build
```

## Open questions (flagged, not resolved here)

Carried over from `agent-briefs/design.md`:

1. **Brand/visual identity** — no confirmed brand exists yet. The design tokens
   (`src/styles/tokens.css`) implement the wireframe's placeholder palette (dark theme
   default, oklch-based green accent, Space Mono for numeric/code data) as a real,
   working light+dark system — swap the token values, not the architecture, once a
   brand is decided.
2. **Module category taxonomy** — the wireframe's Module Store category tags
   (Data/Compute/Analytics/Governance) are not implemented as a manifest field here;
   `groupModulesByNav` only recognizes ADR 0017's `build`/`view`/`manage`. Confirmed by
   a passing contract test (`manifest.test.ts`) that explicitly rejects `"governance"`
   as a nav group.

Found while building against the real `booth-core` and `booth-module-store` repos
(not just their docs), rather than resolved unilaterally:

3. **`GET /api/modules` doesn't return `uiIntegrationMode`.** `contracts/module-
   manifest.md` requires it whenever `hasOwnUi` is true, and `ContentPane` needs it to
   pick native vs. iframe-proxy — but `booth-core`'s `moduleView` struct
   (`internal/api/server.go`) omits it, even though the underlying `BoothModule` CRD
   spec has the field. Until core adds it, `ContentPane` defaults every module to
   `native` (wrong for iframe-proxy modules) and logs nothing beyond a code comment —
   flagged here rather than guessed around further.
4. **`GET /api/me`'s JSON casing is inconsistent.** `memberships`/`active` are
   lowerCamelCase keys at the top level, but their nested `Workspace`/`Role` fields
   serialize capitalized — `auth.Membership` has no `json` struct tags. Isolated behind
   `normalizeMembership`/`normalizeIdentity` (`src/lib/api/types.ts`) so a future core-
   side fix (adding tags) only needs a one-line change here, but the inconsistency
   itself is worth a small core-side fix rather than every consumer adapting around it
   forever.
5. **How a `native`-mode module's UI actually gets delivered into this shell isn't
   decided.** `contracts/ui-integration.md`'s literal text describes `native` as
   *booth-design* authoring a module's UI against that module's data API. But
   `booth-module-store`'s already-built `ModuleStoreApp` is a complete, self-contained
   React component whose own comment says this shell should mount it "with no wiring
   beyond rendering it" — which only works if native modules ship their own component
   for this shell to mount (same micro-frontend shape as iframe-proxy, minus the
   iframe), not if booth-design writes their pages itself. `src/lib/nativeModules.ts`
   builds a mount-point registry for the second reading (since it's the one code
   already exists for) and documents the ambiguity; the Module Store slot
   (`src/pages/ModuleStorePage.tsx`) is wired through it but has nothing registered
   yet — pending both an answer here and a decided delivery mechanism (npm package?
   monorepo import? something else) for handing `ModuleStoreApp` to this shell's
   bundle at build or run time.
