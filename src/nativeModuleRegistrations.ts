/**
 * Every native-mode module's npm package gets registered here, per ADR 0030
 * (../booth-architecture/decisions/0030-native-module-ui-delivered-as-npm-package.md).
 * Imported once, for its side effects, from src/main.tsx before the app renders.
 *
 * Module Store: waiting on booth-module-store to publish `@projectbooth/module-store-
 * ui` (not on npm yet — checked 2026-09-18) and to confirm it accepts the prop
 * contract proposed in src/lib/nativeModules.ts's NativeModuleProps (workspace, role,
 * theme). Once published, this file becomes:
 *
 *   import { ModuleStoreApp } from "@projectbooth/module-store-ui";
 *   import { MODULE_STORE_SLOT_ID, registerNativeModule } from "@/lib/nativeModules";
 *
 *   registerNativeModule(MODULE_STORE_SLOT_ID, ModuleStoreApp);
 *
 * plus adding the package to package.json's dependencies. Left empty (rather than only
 * existing as a comment elsewhere) so wiring the real module in is a small diff to this
 * one file, not a new file to create.
 */

export {};
