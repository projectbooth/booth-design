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
                       components (ADR 0030) + the NativeModuleProps contract
src/nativeModuleRegistrations.ts  where each native module's package gets registered
                       (imported once from main.tsx) — Module Store's entry is
                       pending, see "Open questions" below
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
(not just their docs). #3 and #4 are `booth-core` bugs, flagged there — no action
needed on this side beyond the existing workaround until they ship. #5 was resolved by
ADR 0030; its follow-up (the concrete package/prop contract) is still open, now being
worked out directly with `booth-module-store` rather than guessed at unilaterally:

3. **`GET /api/modules` doesn't return `uiIntegrationMode`.** `contracts/module-
   manifest.md` requires it whenever `hasOwnUi` is true, and `ContentPane` needs it to
   pick native vs. iframe-proxy — but `booth-core`'s `moduleView` struct
   (`internal/api/server.go`) omits it, even though the underlying `BoothModule` CRD
   spec has the field. Until core adds it, `ContentPane` defaults every module to
   `native` (wrong for iframe-proxy modules). **Status (2026-09-18): not yet shipped**
   — `booth-core`'s `main` still lacks the field as of this check. Once it lands,
   `ContentPane`'s fallback comment marks exactly what to remove.
4. **`GET /api/me`'s JSON casing is inconsistent.** `memberships`/`active` are
   lowerCamelCase keys at the top level, but their nested `Workspace`/`Role` fields
   serialize capitalized — `auth.Membership` has no `json` struct tags. Isolated behind
   `normalizeMembership`/`normalizeIdentity` (`src/lib/api/types.ts`) so a future core-
   side fix (adding tags) only needs a one-line change here. **Status (2026-09-18): not
   yet shipped.** Once core adds tags and the shape stabilizes, drop the adapter and
   consume `RawIdentity`'s fields directly — the two unit tests in
   `src/lib/api/__tests__/types.test.ts` pin the current (workaround-needing) shape and
   should fail first if core's response shape changes.
5. **How a `native`-mode module's UI gets delivered into this shell — resolved by
   [ADR 0030](../booth-architecture/decisions/0030-native-module-ui-delivered-as-npm-package.md):**
   each native-mode module publishes its own React component as a versioned npm
   package (`@projectbooth/<module-id>-ui`); this shell adds it as an ordinary
   dependency and mounts it via `src/lib/nativeModules.ts`'s registry — confirmed as
   the right shape, no rework needed. **Still open:** the exact prop/shared-context
   contract a mounted component receives. This repo proposed plain props —
   `{ workspace, role, theme }` (`NativeModuleProps` in `src/lib/nativeModules.ts`),
   not a shared React context, since a context would mean `module-store-ui` importing
   something `booth-design` exports, inverting the dependency direction ADR 0030 just
   fixed — to `booth-module-store`'s agent directly, along with a real bug it surfaces
   (`web/src/api/client.ts` never sends `X-Workspace`, so its calls can't be scoped to
   a workspace once mounted for real). Awaiting their response and their first publish
   of `@projectbooth/module-store-ui` (checked npm 2026-09-18: not published yet).
   `src/nativeModuleRegistrations.ts` is where that package gets registered once it
   exists — everything on this side is ready, down to the prop shape, pending that
   package landing. If the props-vs-context question and field list end up needing to
   live in `contracts/ui-integration.md` rather than just this conversation, said so in
   that message too.
