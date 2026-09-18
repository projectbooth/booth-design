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
 * The prop contract below (workspace/role/theme) is this repo's proposal, sent to
 * booth-module-store as its first real consumer (contracts/ui-integration.md: "not yet
 * specified; booth-design and booth-module-store are working this out"). If it settles
 * differently, update this type — it's the one place every registration goes through.
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
