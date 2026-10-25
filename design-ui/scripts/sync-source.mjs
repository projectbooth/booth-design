#!/usr/bin/env node
// Copies the canonical source (../src, the main app's own component library) into
// src/vendor before each build. This is the one thing that keeps design-ui's published
// package and the shell app's own components from drifting: there is exactly one place
// anyone edits this code (../src/components/ui), and src/vendor is a mechanically
// regenerated, gitignored snapshot of it — never hand-edited.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appSrc = join(here, "..", "..", "src");
const vendor = join(here, "..", "src", "vendor");

rmSync(vendor, { recursive: true, force: true });
mkdirSync(vendor, { recursive: true });

// Keep this list in sync with design-ui/src/index.ts's exports — copy only what's
// actually published, not the whole app.
const files = [
  "components/ui/Tooltip.tsx",
  "components/ui/HelpHint.tsx",
  "components/ui/icons.tsx",
  "lib/cn.ts",
];

for (const relPath of files) {
  const src = join(appSrc, relPath);
  const dest = join(vendor, relPath);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
}

console.log(`design-ui: synced ${files.length} file(s) from ../src into src/vendor`);
