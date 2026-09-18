/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// booth-core's gateway hosts this shell in a real deployment (ARCHITECTURE.md §3);
// locally, proxy /api to a running booth-core instance so the shell can be developed
// against real session/module data instead of mocks. Mirrors booth-module-store's
// vite.config.ts BOOTH_MODULE_STORE_DEV_BACKEND pattern.
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
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
  },
});
