/**
 * Wire types for booth-core's HTTP API (internal/api/server.go). These mirror the
 * ACTUAL current JSON shapes observed by reading booth-core's source, not
 * contracts/core-platform-api.md (which doesn't specify per-field JSON shapes) —
 * that contract only fixes the header/claim mechanics (ADR 0025), not response bodies.
 *
 * Two things worth flagging back to the coordinator (see repo README's "Open
 * questions" section):
 *
 * 1. `GET /api/me`'s `memberships`/`active` fields serialize their nested
 *    Workspace/Role keys capitalized (Go's default field-name-as-JSON-key, since
 *    `auth.Membership` carries no json struct tags) while every other field in this
 *    same response is lowerCamelCase. RawMembership below matches this AS-IS; the
 *    rest of this codebase should go through `normalizeMembership` and never touch
 *    RawMembership directly, so a future core-side fix (adding json tags) only needs
 *    a one-line change here.
 * 2. `GET /api/modules` omits `uiIntegrationMode` entirely (see ModuleSummary below) —
 *    the shell cannot yet tell native from iframe-proxy from this endpoint alone.
 */

export type WorkspaceRole = "owner" | "editor" | "viewer";

/** As booth-core actually serializes it today — see file-level note #1. */
export interface RawMembership {
  Workspace: string;
  Role: WorkspaceRole;
}

export interface Membership {
  workspace: string;
  role: WorkspaceRole;
}

export function normalizeMembership(raw: RawMembership): Membership {
  return { workspace: raw.Workspace, role: raw.Role };
}

export interface RawIdentity {
  subject: string;
  email: string;
  memberships: RawMembership[];
  active: RawMembership;
}

export interface Identity {
  subject: string;
  email: string;
  memberships: Membership[];
  /** The workspace the caller most recently validated via X-Workspace (ADR 0025 §6). */
  active: Membership;
}

export function normalizeIdentity(raw: RawIdentity): Identity {
  return {
    subject: raw.subject,
    email: raw.email,
    memberships: raw.memberships.map(normalizeMembership),
    active: normalizeMembership(raw.active),
  };
}

/**
 * GET /api/modules response shape (internal/api/server.go's `moduleView`).
 * NOTE: does not include `uiIntegrationMode` — see file-level note #2. Until core adds
 * it, `uiIntegrationMode` is `undefined` here and the content pane falls back to
 * `native` (src/components/shell/ContentPane.tsx), which is wrong for iframe-proxy
 * modules. Flagged, not silently worked around further than that fallback.
 */
export interface ModuleSummary {
  id: string;
  displayName: string;
  icon?: string;
  version: string;
  hasOwnUi: boolean;
  navPath?: string;
  navGroup?: "build" | "view" | "manage";
  adminNavPath?: string;
  /** Not yet returned by booth-core — see file-level note #2. */
  uiIntegrationMode?: "native" | "iframe-proxy";
  phase?: string;
}
