# @projectbooth/design-ui

Shared presentational primitives from booth-design's own component library, published so other
`@projectbooth/*-ui` modules can depend on them instead of re-implementing the same pattern per
module (booth-pipeline's `docs/decisions/0004-ui-component-library.md`). Source lives in
booth-design's own `src/components/ui/` — this package is a publish boundary, not a second copy;
`scripts/sync-source.mjs` copies it into the gitignored `src/vendor/` before every build, so there
is exactly one place anyone edits this code.

**v0 scope: `Tooltip`/`HelpHint` only.** More primitives (`Button`, `Field`, `DataTable`, etc.) are
expected to follow, driven by what consuming modules actually need — not sketched ahead of demand.

## Installing

```json
{
  "dependencies": {
    "@projectbooth/design-ui": "0.1.0"
  }
}
```

Same exact-pin convention every `@projectbooth/*-ui` dependency in booth-design's own
`package.json` already follows — no caret. Different modules can sit on different `design-ui`
versions at the same time with no conflict (ADR 0097 already means each module bundles its own
compiled output independently, and the shell's Tailwind content glob just scans literal
class-name strings in each module's `dist/*.js` regardless of which `design-ui` version produced
them).

## Two things a consuming module must do

1. **Add `node_modules/@projectbooth/design-ui/dist/**/*.js` to your own Tailwind `content`
   glob**, not just your own `src/`. `HelpHint`'s classes live inside `design-ui`'s compiled
   output, not your source — your Tailwind build only generates CSS for classes it can find as
   literal strings in whatever its own `content` glob scans. Skipping this silently produces an
   unstyled button, not an error.

2. **Mount your own `TooltipProvider` around wherever you use `HelpHint`** — do not rely on the
   shell's. This is *not* the per-module-Provider workaround an earlier draft of this package's
   design note proposed. `react`, `react-dom` and `@radix-ui/react-tooltip` are all `peerDependencies`
   here (see `vite.config.ts`'s `rollupOptions.external` — the identical mechanism every
   `@projectbooth/*-ui` module's own build already uses to externalize `react`/`react-dom`,
   extended to the one Radix package this package uses). booth-design's own final `vite build`
   resolves every module's externalized imports against its own single installed copy of each
   package, so there is exactly **one** `@radix-ui/react-tooltip` module instance — and exactly
   one Context object — across the whole app, the shell included. Mounting your own
   `TooltipProvider` is required because Radix's `Tooltip` needs *a* provider somewhere above it
   in the tree, same as in any app; it is not needed to work around a duplicated-context problem,
   because there isn't one.

```tsx
import { HelpHint, TooltipProvider } from "@projectbooth/design-ui";

export function MyModuleRoot() {
  return (
    <TooltipProvider delayDuration={300}>
      {/* ...your module's own UI, anywhere using HelpHint... */}
    </TooltipProvider>
  );
}
```

## Building and publishing (this repo only)

```
npm run build           # scripts/sync-source.mjs, then vite build + tsc -p tsconfig.json
```

Published by `.github/workflows/design-ui-publish.yml` on a `design-ui-v*` tag push, mirroring
every other `@projectbooth/*-ui` module's own `publish.yml`.
