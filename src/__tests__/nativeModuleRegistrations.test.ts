import { describe, expect, it } from "vitest";
import { ModuleStoreApp } from "@projectbooth/module-store-ui";
import { StorageApp } from "@projectbooth/storage-ui";
import { CatalogApp } from "@projectbooth/catalog-ui";
import { PipelineApp } from "@projectbooth/pipeline-ui";
import { LoggingApp } from "@projectbooth/logging-ui";
import { DatabaseApp } from "@projectbooth/database-ui";
import { LakehouseApp } from "@projectbooth/lakehouse-ui";
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

  it("registers LoggingApp under the manifest id `logging`", () => {
    expect(getNativeModule("logging")).toBe(LoggingApp);
  });

  it("registers DatabaseApp under the manifest id `database`", () => {
    expect(getNativeModule("database")).toBe(DatabaseApp);
  });

  it("registers LakehouseApp under the manifest id `lakehouse`", () => {
    expect(getNativeModule("lakehouse")).toBe(LakehouseApp);
  });
});
