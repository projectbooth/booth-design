import { describe, expect, it } from "vitest";
import { ModuleStoreApp } from "@projectbooth/module-store-ui";
import { StorageApp } from "@projectbooth/storage-ui";
import { CatalogApp } from "@projectbooth/catalog-ui";
import { PipelineApp } from "@projectbooth/pipeline-ui";
import { getNativeModule, MODULE_STORE_SLOT_ID } from "@/lib/nativeModules";
import "../nativeModuleRegistrations";

describe("nativeModuleRegistrations", () => {
  it("registers the real ModuleStoreApp at the Module Store slot", () => {
    expect(getNativeModule(MODULE_STORE_SLOT_ID)).toBe(ModuleStoreApp);
  });

  it("registers the combined StorageApp under the manifest id `storage`", () => {
    expect(getNativeModule("storage")).toBe(StorageApp);
  });

  it("registers CatalogApp under the manifest id `catalog`", () => {
    expect(getNativeModule("catalog")).toBe(CatalogApp);
  });

  it("registers PipelineApp under the manifest id `pipeline`", () => {
    expect(getNativeModule("pipeline")).toBe(PipelineApp);
  });
});
