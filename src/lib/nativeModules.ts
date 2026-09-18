import type { ComponentType } from "react";

/**
 * Mount-point registry for `native`-mode modules' own React components.
 *
 * OPEN QUESTION (flagged, not resolved here — see repo README): contracts/ui-
 * integration.md's literal text says `native` means "booth-design renders it using
 * the shared component library" — i.e. booth-design authors each module's UI against
 * that module's data API. But booth-module-store's actual `ModuleStoreApp` (its
 * web/src/ModuleStoreApp.tsx) is a complete, self-contained React component that its
 * own README says booth-design should mount "with no wiring beyond rendering it" —
 * which only works if *every* native module ships its own component for this shell to
 * mount, the same micro-frontend shape iframe-proxy uses minus the iframe. This
 * registry is built for that second reading, since it's the one booth-module-store
 * already committed code to. If the first reading is what's actually intended for
 * modules besides Module Store, this registry becomes unnecessary and those modules'
 * pages get built directly in src/pages instead.
 *
 * Delivery mechanism (npm package? monorepo path import? something else) is also not
 * decided — nothing here assumes one. A real module wires itself in by calling
 * `registerNativeModule` from wherever its bundle ends up loaded.
 */

const registry = new Map<string, ComponentType>();

export function registerNativeModule(moduleId: string, Component: ComponentType) {
  registry.set(moduleId, Component);
}

export function getNativeModule(moduleId: string): ComponentType | undefined {
  return registry.get(moduleId);
}

/** Reserved outside Build/View/Manage, alongside Home/Settings (ADR 0027). */
export const MODULE_STORE_SLOT_ID = "module-store";
