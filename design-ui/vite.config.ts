import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Publishes @projectbooth/design-ui from this repo's own src/components/ui (design-ui/src/index.ts
// re-exports it; see that file). Entry/output paths are anchored to this config file's own
// location via import.meta.url, not to whatever directory `vite build` is invoked from, so the
// root package.json's "build:design-ui" script can run this with
// `--config design-ui/vite.config.ts` from the repo root.
//
// react/react-dom and every @radix-ui/* package Tooltip.tsx/HelpHint.tsx use are external, exactly
// the convention every @projectbooth/*-ui module's own vite.config.ts already follows for
// react/react-dom (two copies of React in one page is a classic "Invalid hook call"; a duplicated
// @radix-ui/react-tooltip would duplicate its internal React Context the same way, which is what
// forced a per-module Provider wrapper before this package externalized it too). booth-design's
// own final `vite build` already depends on all of these directly, so its one copy is what every
// module's bundled import resolves against.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src/vendor", import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      formats: ["es"],
      fileName: "index",
    },
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", "@radix-ui/react-tooltip"],
    },
  },
});
