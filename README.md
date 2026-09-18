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

Authentication is a client-side OAuth2 Authorization Code + PKCE flow against the
configured OIDC provider (ADR 0032) — `booth-core` has no cookie/session mechanism at
all, only bearer-token verification. See "Authentication" below.

## Repo layout

```
src/lib/auth/          client-side OIDC PKCE flow (ADR 0032): pkce.ts (RFC 7636
                       crypto), discovery.ts (OIDC discovery doc), config.ts (issuer/
                       client ID), tokenStore.ts (in-memory token state),
                       authClient.ts (login/callback/refresh/logout), AuthGate.tsx
                       (the boot-time gate every route sits behind)
src/lib/api/          typed client + wire types for booth-core's actual /api/me,
                       /api/modules, /api/modules/{id}/iframe-url endpoints —
                       attaches the bearer token from src/lib/auth on every call
src/lib/session.tsx    identity + active-workspace context (ADR 0025)
src/lib/manifest.ts    navGroup/uiIntegrationMode contract types + grouping logic
                       (contract tests live in src/lib/__tests__/manifest.test.ts)
src/lib/nativeModules.ts  mount-point registry for native-mode modules' own React
                       components (ADR 0030) + the NativeModuleProps contract
                       (ADR 0031: workspace, role, theme)
src/nativeModuleRegistrations.ts  where each native module's package gets registered
                       (imported once from main.tsx) — Module Store's entry is
                       ready to wire in, see "Open questions" below
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

## Authentication

Per ADR 0032: an unauthenticated visit redirects to the configured OIDC provider
(Keycloak by default), no client secret (public SPA client). The access token lives in
memory only for the tab's lifetime — never `localStorage` — and is attached as
`Authorization: Bearer <token>` on every `src/lib/api/client.ts` call. A refresh token,
if the provider issues one, silently renews the access token before it expires. Logout
clears local state and ends the session at the provider's end-session endpoint.

Requires two build-time env vars (see `.env.example`), the same values `booth-core`
itself is configured with:

```
VITE_OIDC_ISSUER_URL=https://keycloak.example.com/realms/booth
VITE_OIDC_CLIENT_ID=booth-design
```

Chosen over an `/api/config`-style endpoint from core because these are public,
non-secret values (ADR 0032 says so directly) and adding such an endpoint would be a
`booth-core` contract change this repo doesn't own — revisit if ops tooling later wants
runtime reconfiguration without a shell rebuild.

A full page reload loses the in-memory token and re-triggers the redirect — this is the
ADR's intended shape ("held in memory for the session's lifetime"), not a bug. In
practice a reload's redirect to Keycloak usually completes silently if the provider
still has an active browser SSO session; if that friction turns out to matter, a
`prompt=none` silent-check on boot (a well-known SPA-PKCE pattern) is the natural next
step, not built here since it's not part of what ADR 0032 asked for.

**Dependency on Keycloak realm config not yet built:** ADR 0025's consequences already
noted `booth-core` needs to ship a bundled realm config (`workspaces` group structure,
role mappers); that same realm config also needs to register `booth-design`'s client ID
as a public client with PKCE enabled and the right redirect URI / CORS "Web Origins"
allowlist (the token endpoint call in `src/lib/auth/authClient.ts` is a direct
cross-origin browser fetch to the provider, not proxied through core). This repo can't
verify that end-to-end until that realm config exists — flagging it here rather than
assuming a default Keycloak setup would just work.

## Running locally

```
npm install
npm run dev
# proxies /api to booth-core; needs VITE_OIDC_ISSUER_URL/VITE_OIDC_CLIENT_ID set
# (see "Authentication") to get past the login redirect at all
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
(not just their docs). #3, #4, and the ADR 0030 half of #5 are now resolved:

3. ~~`GET /api/modules` didn't return `uiIntegrationMode`~~ — **fixed** (confirmed
   2026-09-18 against `booth-core`'s current `internal/api/server.go`). `ContentPane`
   now dispatches correctly; its `native` default is a defensive fallback for the
   `hasOwnUi: false` case, not a workaround anymore.
4. ~~`GET /api/me`'s JSON casing was inconsistent~~ — **fixed** (confirmed 2026-09-18
   against `internal/auth/workspace.go`: `Membership` now carries `json:"workspace"`/
   `json:"role"` tags). The `normalizeMembership`/`normalizeIdentity` adapter this
   repo built to isolate the old shape is gone — `src/lib/api/types.ts` consumes core's
   response directly now.
5. ~~How a `native`-mode module's UI gets delivered into this shell~~ — **resolved and
   wired in.** [ADR 0030](../booth-architecture/decisions/0030-native-module-ui-delivered-as-npm-package.md)
   (npm package, mounted via `src/lib/nativeModules.ts`'s registry) and
   [ADR 0031](../booth-architecture/decisions/0031-native-module-props-contract.md)
   (the `{ workspace, role, theme }` prop contract this repo proposed) are both
   implemented: `@projectbooth/module-store-ui@0.1.0` is a real dependency (from
   GitHub Packages, `npm.pkg.github.com` — see `.npmrc`; CI's `packages: read`
   permission and `actions/setup-node`'s `registry-url`/`scope` inputs handle auth
   there), registered in `src/nativeModuleRegistrations.ts`, and its shipped
   `ModuleStoreAppProps` type-checks cleanly against this repo's `NativeModuleProps` —
   confirmed by reading its `.d.ts`, not assumed. Pinned by
   `src/__tests__/nativeModuleRegistrations.test.ts`.
6. **New: `@projectbooth/module-store-ui@0.1.0`'s own API calls will 401 against a
   real booth-core.** Its bundled `web/src/api/client.ts` still sends `credentials:
   "include"` and attaches no bearer token — the exact wrong cookie-based auth
   assumption ADR 0032 corrected in this repo, just not yet on that side (timing: ADR
   0032 and this package's publish landed the same day). There's currently no prop or
   mechanism for this shell to hand it the access token it holds in
   `src/lib/auth/tokenStore.ts` — `ModuleStoreAppProps` has no `accessToken` field.
   This is exactly the open item ADR 0032's own consequences section flagged ("the
   exact mechanism for how a mounted native component accesses the token booth-design
   obtained isn't specified... left as an implementation detail between booth-design
   and native modules, escalating only if it turns out to need standardizing") —
   flagged to `booth-module-store`'s agent directly, proposing an `accessToken: string`
   addition to `ModuleStoreAppProps` (same props-not-context shape ADR 0031 already
   established) rather than resolved unilaterally here. Registered the component
   anyway rather than leaving it out — it's the real integration point and correct
   structurally, just visibly broken against a real deployment until this lands.
