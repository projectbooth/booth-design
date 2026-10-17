# Design note: service accounts UI (ADR 0120)

Status: **draft, for coordinator review** — no code in this change. Written against core 0.3.7's final route shapes (forwarded by the coordinator, below). Does not touch booth-pipeline's service-account picker; that is Pipeline's own UI.

## Routes this is built on

```
GET    /api/service-accounts           owner-only list -> [{id, name, role, description, disabled, createdBy, createdAt}]
GET    /api/service-accounts/{name}    any member -> {name, role, disabled}; 404 if absent
POST   /api/service-accounts           owner-only, {name, role: viewer|editor, description} -> 201; 400; 409 (name taken)
PATCH  /api/service-accounts/{name}    owner-only, {role?, description?, disabled?} -> 200
DELETE /api/service-accounts/{name}    owner-only -> 204; 409 unless disabled first
```

All calls are scoped by the `X-Workspace` header (ADR 0025 §6), not a path segment — the same convention `src/lib/api/client.ts`'s `request()` already applies to every core call via its `workspace` option. The id shown to people is `svc:<workspace>:<name>`; the API itself only ever takes/returns the bare `name`. There is no usage registry (ADR 0120 addendum 1, point 5): the only delete safeguard is disable-first.

## Where it lives

A new **"Service accounts"** section inside workspace settings, owner-only. `SettingsPage.tsx` today is purely personal (identity, theme, log out) — this needs a workspace-scoped counterpart. Proposal: keep `/settings` as-is and add `/settings/service-accounts` as a sibling route, link it from `SettingsPage` only when `activeWorkspace?.role === "owner"` (same `isOwner` check `NavRail.tsx` already does for `adminNavPath`), and 403/redirect if a non-owner reaches the route directly — core will 403 the list call regardless, so the client-side gate is UX, not the security boundary.

This is the shell's own page, not a native module panel: there is no `service-accounts-ui` package, core said the shell owns this UI (ADR 0120 addendum 1, point 4), so it's built the same way `SettingsPage`/`ModuleStorePage` are — direct calls through `src/lib/api/client.ts`, extended with `listServiceAccounts`, `getServiceAccount`, `createServiceAccount`, `updateServiceAccount`, `deleteServiceAccount`, each taking `workspace` the way `installModule` already does and surfacing `ApiError` the same way.

## List

`DataTable` with columns: **Name** (mono, rendered as `svc:<workspace>:<name>` per ADR 0120 point 1), **Role** (plain text, `viewer`/`editor`), **Description**, **Status** (`StatusBadge` — `tone="neutral"` "Active" when not disabled, `tone="warning"` "Disabled" when disabled; no "in use" tone exists since there's no usage registry — ADR 0120 addendum 1 dropped that), **Created** (mono, `createdBy` + relative `createdAt`), and a row-level actions column (role change, disable/enable, delete — see below). Sourced from `GET /api/service-accounts`, refetched after every mutation rather than optimistically patched, matching the rest of the shell's admin views.

Empty state (`DataTable`'s `emptyState` prop): plain text explaining what a service account is, since a workspace with zero service accounts is the common case and this may be the first time an owner sees the concept — "A service account is a non-human owner for automated work — it signs nothing in itself, but a pipeline can name it as owner so the job's access doesn't depend on a person staying logged in." Same copy (shortened) appears as a persistent hint above the table once accounts exist, not just in the empty state, since "cannot sign in" is the one fact that most needs to survive into someone's mental model before they create one.

## Create

A dialog (the shell has no `Dialog` wrapper around `@radix-ui/react-dialog` yet, despite the dependency already being installed — storage-ui's and api-ui's forms are each module's own component, not shared; this page needs the shell's first one, which is a prerequisite for the build, not something to design around here) with:
- **Name** (`Input`, required, lowercase/hyphen validation client-side to pre-empt the 400 rather than relying on it — core's exact pattern isn't in the route shapes above, so this needs a one-line confirmation from core before build, not a guess here)
- **Description** (`Input`, optional)
- **Role** (`Select`, `viewer` | `editor` — capped at editor per ADR 0120 point 1, no "owner" option ever rendered)

Submits `POST /api/service-accounts`. On success (201), close and refetch the list. On 400, show the validation message inline under Name rather than a toast. On 409 (name taken), same placement — "`svc:<workspace>:<name>` already exists" — since the workspace-scoped name is what's actually colliding, even though the user only typed the bare name.

## Role change

Inline on the row: the same `Select` used in create, submitting `PATCH {role}` on change. Optimistic update reverted on error (a role change is low-risk enough not to need a confirmation step, unlike disable/delete below).

## Disable / enable

`Switch` on the row (mirrors `SettingsPage`'s theme `Switch`), submitting `PATCH {disabled}`. Disabling is the safety-relevant direction — ADR 0120 point 2 says the next mint for this account is refused immediately, with no grace window — so disabling asks for confirmation ("Disable `svc:<workspace>:<name>`? Any pipeline naming it as owner will fail its next run until it's re-enabled.") Enabling does not, since it only restores prior behavior.

## Delete

Only enabled (not just styled disabled, actually inert) while the row shows disabled=true, per ADR 0120 addendum 1 point 5's disable-then-delete rule. Hovering/focusing an enabled account's delete control shows why it's inert ("Disable this account first"). Confirmation dialog on delete itself ("Delete `svc:<workspace>:<name>`? This can't be undone.") since 204 is permanent and there's no registry to warn about in-use accounts — the confirmation copy deliberately does not claim to check usage, since ADR 0120 addendum 1 point 5 explicitly dropped that guarantee; Pipeline's own UI is where "which pipelines name this account" is answered, not here. On the 409 this route can still return (name not actually disabled — a race with another owner's concurrent edit), refetch and show the current state rather than a raw error, since the fix is "the list was stale," not something the user did wrong.

## Errors

- **503** (core has no Postgres, ADR 0120 addendum 1 point 2 — service accounts have no in-memory fallback by design) — treat the whole section as unavailable, not row-by-row: a banner replacing the table, "Service accounts aren't available right now," no retry button that would just 503 again immediately. This is the one error state that isn't scoped to a single action.
- **403** on the list call — shouldn't be reachable given the owner-only nav gate above, but if it happens (role changed mid-session), fall back to the same "you don't have access to this" treatment the shell already uses elsewhere for a lapsed owner, not a bespoke message here.
- **404** on a single lookup (see below) — "not found," since by the time a non-owner can see a reference to one, it may have been deleted.

## Non-owner view

Non-owners never see the `/settings/service-accounts` section at all (list is owner-only). The single-account lookup (`GET /api/service-accounts/{name}` → `{name, role, disabled}`, any member) isn't used by this page — it exists for other surfaces that display a service account by name without needing the full management list, the clearest example being Pipeline's owner display showing whether the account a non-owner-visible pipeline is owned by is still enabled. That's Pipeline's UI to build against this endpoint, not something added here; noted for completeness since the brief asked how non-owners see accounts at all, and the answer is "only this narrow, read-only, elsewhere."

## Open items before build

1. No shared `Dialog` component exists yet; this page's create/confirm flows need one, and it should be built as a reusable `src/components/ui/Dialog.tsx`, not a one-off.
2. Name validation rule (format core actually enforces for 400) isn't in the forwarded route shapes — needs a one-line confirmation, not guessed here.
3. Test account on the homelab, `svc:home:nfl` (editor) — usable as-is for manual verification once built; no fixture needed beyond it.
