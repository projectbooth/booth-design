import { describe, expect, it } from "vitest";
import { ModuleStoreApp } from "@projectbooth/module-store-ui";
import { getNativeModule, MODULE_STORE_SLOT_ID } from "@/lib/nativeModules";
import "../nativeModuleRegistrations";

describe("nativeModuleRegistrations", () => {
  it("registers the real ModuleStoreApp at the Module Store slot", () => {
    expect(getNativeModule(MODULE_STORE_SLOT_ID)).toBe(ModuleStoreApp);
  });
});
