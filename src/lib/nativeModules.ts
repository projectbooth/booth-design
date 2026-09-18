import type { ComponentType } from "react";
import type { WorkspaceRole } from "./api/types";

/**
 * Mount-point registry for `native`-mode modules' own React components.
 *
 * RESOLVED by ADR 0030 (../booth-architecture/decisions/0030-native-module-ui-
 * delivered-as-npm-package.md): a native-mode module ships its own UI as a versioned
 * npm package (`@projectbooth/<module-id>-ui`), booth-design adds it as an ordinary
 * dependency and mounts it here. This registry's shape was confirmed correct — no
 * rework, just modules to register (see src/nativeModuleRegistrations.ts).
 *
 * The prop contract below is now pinned in contracts/ui-integration.md: workspace/
 * role/theme by ADR 0031, getAccessToken by ADR 0033. If it ever needs to change
 * again, that's a coordinator-level contract change, not something to redecide here
 * unilaterally the way the first round (ADR 0030/0031) got proposed from this side.
 */

export interface NativeModuleProps {
  /** Active workspace slug (ADR 0025) — a module's own API calls need this to set
   *  X-Workspace themselves; booth-design's gateway proxying doesn't do it for them. */
  workspace: string;
  /** Caller's role in that workspace — for client-side gating of owner-only actions
   *  (server-side enforcement, e.g. ADR 0023's requireAdmin, is authoritative regardless). */
  role: WorkspaceRole;
  /** Optional to act on — CSS-only styling already follows the global `data-theme`
   *  attribute on <html> (src/lib/theme.ts); this is only for JS-driven theme
   *  decisions (e.g. a chart color scheme) that CSS alone can't express. */
  theme: "dark" | "light";
  /**
   * Returns this shell's current bearer token (src/lib/auth's OIDC PKCE flow, ADR
   * 0032), or null if not yet authenticated / logged out. A callback, not a plain
   * `accessToken: string` value — ADR 0033's whole point: a value captured at mount
   * (or at whatever render last passed a fresh one) goes stale the moment the
   * in-memory token silently refreshes, with no guarantee that refresh triggers a
   * re-render of every mounted native module. A module must call this fresh
   * immediately before each of its own API requests, never cache the result, and
   * treat `null` as "omit the Authorization header" rather than sending the literal
   * string "Bearer null".
   */
  getAccessToken: () => string | null;
}

const registry = new Map<string, ComponentType<NativeModuleProps>>();

export function registerNativeModule(moduleId: string, Component: ComponentType<NativeModuleProps>) {
  registry.set(moduleId, Component);
}

export function getNativeModule(moduleId: string): ComponentType<NativeModuleProps> | undefined {
  return registry.get(moduleId);
}

/** Reserved outside Build/View/Manage, alongside Home/Settings (ADR 0027). */
export const MODULE_STORE_SLOT_ID = "module-store";
