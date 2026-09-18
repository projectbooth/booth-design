import { NativeModulePane } from "@/components/shell/NativeModulePane";
import { MODULE_STORE_SLOT_ID } from "@/lib/nativeModules";
import type { ModuleSummary } from "@/lib/api/types";

// Module Store is shell-level chrome (ADR 0027), not an entry in the Build/View/Manage
// module list — so it gets a synthetic ModuleSummary rather than one sourced from
// GET /api/modules, and goes through the same native-mount mechanism every other
// native module uses (src/lib/nativeModules.ts).
const MODULE_STORE_SUMMARY: ModuleSummary = {
  id: MODULE_STORE_SLOT_ID,
  displayName: "Module Store",
  version: "n/a",
  hasOwnUi: true,
  uiIntegrationMode: "native",
};

export function ModuleStorePage() {
  return <NativeModulePane module={MODULE_STORE_SUMMARY} />;
}
