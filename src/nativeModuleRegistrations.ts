import { ModuleStoreApp } from "@projectbooth/module-store-ui";
import "@projectbooth/module-store-ui/dist/style.css";
import { StorageApp } from "@projectbooth/storage-ui";
import "@projectbooth/storage-ui/dist/style.css";
import { CatalogApp } from "@projectbooth/catalog-ui";
import "@projectbooth/catalog-ui/dist/style.css";
import { MODULE_STORE_SLOT_ID, registerNativeModule } from "@/lib/nativeModules";

/**
 * Every native-mode module's npm package gets registered here, per ADR 0030
 * (../booth-architecture/decisions/0030-native-module-ui-delivered-as-npm-package.md).
 * Imported once, for its side effects, from src/main.tsx before the app renders. The key
 * is the module's manifest `id`, which is what NativeModulePane looks up — a module with
 * no entry here shows the "aren't wired into the shell yet" placeholder, so adding a
 * native module's package to package.json without registering it here does nothing.
 *
 * Each package's ModuleProps are a superset of NativeModuleProps (ADR 0031/0033:
 * workspace, role, theme, getAccessToken); their remaining props are optional, so a bare
 * registration type-checks and works.
 */

// Module Store is shell-level (ADR 0027), not an entry in the module list, so it has its
// own reserved slot id rather than a manifest id.
registerNativeModule(MODULE_STORE_SLOT_ID, ModuleStoreApp);

// The combined StorageApp, not StorageBrowseApp/StorageAdminApp separately: the shell
// mounts one component per module id for both the module's navPath and adminNavPath, and
// StorageApp reads the current path itself to choose between its browse and admin views.
registerNativeModule("storage", StorageApp);

// A single view (its own routes live beneath the module's navPath); no admin split.
registerNativeModule("catalog", CatalogApp);
