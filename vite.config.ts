/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// booth-core's gateway hosts this shell in a real deployment (ARCHITECTURE.md §3);
// locally, proxy /api and /modules to a running booth-core instance so the shell can be
// developed against real session/module data instead of mocks. /modules/{id}/* is
// booth-core's gateway convention for every native and iframe-proxy module's own API
// calls (e.g. module-store-ui's /modules/module-store/api/catalog). Mirrors
// booth-module-store's vite.config.ts BOOTH_MODULE_STORE_DEV_BACKEND pattern.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.BOOTH_DESIGN_DEV_BACKEND ?? "http://localhost:8080",
        changeOrigin: true,
      },
      "/modules": {
        target: process.env.BOOTH_DESIGN_DEV_BACKEND ?? "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
  },
});
