/**
 * Wire types for booth-core's HTTP API (internal/api/server.go). These mirror the
 * ACTUAL current JSON shapes observed by reading booth-core's source, not
 * contracts/core-platform-api.md (which doesn't specify per-field JSON shapes) —
 * that contract only fixes the header/claim mechanics (ADR 0025), not response bodies.
 *
 * Two gaps this repo flagged back were fixed by booth-core (confirmed 2026-09-18
 * against its current `internal/auth/workspace.go` and `internal/api/server.go`): `GET
 * /api/me`'s memberships/active now serialize as lowerCamelCase `workspace`/`role`
 * (json tags added), and `GET /api/modules` now includes `uiIntegrationMode`. No
 * adapter layer needed anymore — this file used to carry one (`normalizeMembership`/
 * `normalizeIdentity`, `RawMembership`/`RawIdentity`); see git history if that's ever
 * needed as a reference for isolating a future wire-shape drift the same way.
 */

export type WorkspaceRole = "owner" | "editor" | "viewer";

export interface Membership {
  workspace: string;
  role: WorkspaceRole;
}

export interface Identity {
  subject: string;
  email: string;
  memberships: Membership[];
  /** The workspace the caller most recently validated via X-Workspace (ADR 0025 §6). */
  active: Membership;
}

/** GET /api/modules response shape (internal/api/server.go's `moduleView`). */
export interface ModuleSummary {
  id: string;
  displayName: string;
  icon?: string;
  version: string;
  hasOwnUi: boolean;
  navPath?: string;
  navGroup?: "build" | "view" | "manage";
  adminNavPath?: string;
  /** Present whenever hasOwnUi is true (contracts/module-manifest.md); absent
   *  otherwise (core's `json:"...,omitempty"` on an intentionally-empty Go field). */
  uiIntegrationMode?: "native" | "iframe-proxy";
  phase?: string;
}
