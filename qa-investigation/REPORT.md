# Dark-mode cascade bug — investigation

Branch: `investigate/dark-mode-cascade-bug`. **Not merged, not published** — pending an
ADR ruling. Everything under `qa-investigation/` is throwaway investigation tooling
(harness, mocks, screenshots, this report) plus a temporary `playwright` devDependency
and an eslint ignore for this directory — none of it is meant to ship. `git diff
264eae5` on this branch shows exactly what changed; `tailwind.config.ts`,
`src/nativeModuleRegistrations.ts`, and `vite.config.ts` carry inline
"INVESTIGATION PROTOTYPE" / "NOT for merge" comments at every touched spot.

## 1. Verifying the diagnosis

Reproduced in a real browser (Playwright/Chromium) two ways, against the real
production build (`npm run build`, unmodified `main` composition):

**a. Static check against the actual built CSS.** Loaded the real
`dist/assets/index-*.css` in a real browser, set `data-theme="dark"`, and rendered the
literal markup copied verbatim from each module's own source
(`qa-investigation/verify-static.mjs`):

| element (real class string, from source) | dark-mode computed `background-color` |
|---|---|
| `storage-ui/views/BrowseView.tsx`'s row: `bg-white align-top dark:bg-slate-950` | `rgb(255,255,255)` — should be slate-950 |
| `storage-ui/views/AdminView.tsx`'s row: `bg-white align-top dark:bg-slate-950` | `rgb(255,255,255)` — should be slate-950 |
| `storage-ui/components/ui.tsx`'s amber badge: `bg-amber-100 ... dark:bg-amber-950 ...` | `rgb(254,243,199)` — should be amber-950 |
| `logging-ui/components/LogTable.tsx`'s row: `bg-white dark:bg-slate-950` | `rgb(255,255,255)` — should be slate-950 |

Rule order, read straight out of the built CSS text:

```
.dark\:bg-slate-950  -> rule index 423
.bg-white             -> rule index 443   (443 > 423: bg-white declared later, wins)
.dark\:bg-amber-950  -> rule index 310
.bg-amber-100         -> rule index 437   (437 > 310: bg-amber-100 declared later, wins)
```

**b. Full in-app check, real browser, real mounted components.** Built a throwaway
harness (`qa-investigation/harness.{html,tsx}`) that mounts each real native module
through the shell's real `NativeModulePane`, same imports/CSS as `main.tsx`, added as a
second Vite build entry so it shares the exact same `dist/assets/*.css` the real shell
ships — sidesteps the OIDC login flow (which has no dev bypass, ADR 0032: tokens are
in-memory only) by mocking the gateway API at the Playwright network layer, not by
touching any app code. Screenshots and computed styles for all 7 modules, light and
dark: `qa-investigation/screenshots/before/`.

Confirmed: in dark mode, `storage-browse`, `storage-admin`, and `logging` all render
the light-mode background for the elements above — identical to their own light-mode
screenshots, pixel for pixel. `catalog`, `database`, `pipeline`, `lakehouse` have no
`dark:bg-(slate|amber)-950` elements on the screens checked, consistent with "other
module pages are clean today."

**Diagnosis confirmed.** `:where(...)` does make the dark variant's specificity
(0,1,0), tying it with a plain same-named utility, and concatenation order across the
seven separately-built stylesheets — not anything about dark mode specifically —
decides the winner. This is also, mechanically, exactly why it would equally threaten
any other equal-specificity variant pair across modules, `md:` included (see §3): a
`@media` wrapper contributes zero selector specificity by spec, so a `md:px-4` from one
module's build and a plain `.px-4` from another's are just as order-dependent as the
dark-mode case.

One methodological note, for trust in the evidence above: an early version of the
harness had its own bug (a module-level theme store read `data-theme` at import-graph
evaluation time, which runs *before* the harness's own body code, so every run was
silently pinned to `theme="dark"` regardless of the requested theme). Caught because
the first "after" run showed dark colors in light mode too; fixed by setting
`data-theme` from an inline pre-module `<script>` in `harness.html`, the same reason
`index.html` does it that way. Flagging this so the before/after comparison in §2 is
taken as checked, not assumed — it bit the harness itself before it bit the real app.

## 2. Prototype: option A

### Tailwind config diff — every module vs. the shell

All seven module repos' `web/tailwind.config.js` are **byte-identical** to each other:

```js
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: { extend: {} },
  plugins: [],
};
```

No `theme.extend`, no `plugins`, no `safelist`, no `prefix` — nothing beyond Tailwind's
stock theme. `darkMode` matches the shell's own `tailwind.config.ts` exactly (already
enforced by a comment there: "MUST match booth-module-store's ... exactly"). The
shell's config *adds* CSS-variable-backed semantic tokens (`bg`, `border`, `text`,
`accent`, `danger`, `warning`, `info`, `success`, plus `fontFamily`/`borderRadius`/
`width`/`ringColor`) via `theme.extend` — since `extend` only adds to Tailwind's
default palette rather than replacing it, every module's existing classes (`bg-white`,
`dark:bg-slate-950`, `bg-amber-100`, indigo/slate/etc.) remain generatable under the
shell's config unchanged. **No module uses the shell's own semantic tokens, and the
shell's tokens don't collide with anything a module uses** — the two theories are
additive, not conflicting. Net: nothing blocks a single consolidated build.

### Non-utility CSS that would be lost

Checked all seven `dist/style.css` bundles for `@font-face`, `@keyframes`, and any
selector that isn't a plausible Tailwind-generated utility class. Six modules
(`module-store`, `storage`, `catalog`, `logging`, `database`, `lakehouse`) contain
**nothing but Tailwind utilities** — safe to stop importing entirely under option A.

**`pipeline-ui` is the one exception**, and it's a real one: its `dist/style.css`
bundles `@xyflow/react`'s own hand-authored base stylesheet wholesale — dozens of
`.react-flow__*` selectors (nodes, edges, controls, background, minimap, attribution,
connection lines, the works) plus two custom `@keyframes` (`dashdraw`, for the animated
dashed DAG-edge effect; `pulse` duplicates Tailwind's own default and is harmless
either way). None of this is a Tailwind utility class — content-scanning
`pipeline-ui/dist/index.js` would regenerate *zero* of it, since it was never produced
from a `className` string to begin with. Stopping the import for pipeline-ui as
literally instructed ("stop importing the modules' separate dist/style.css for
utilities") would silently break the entire DAG canvas's rendering, not just the dash
animation.

**Adjustment made to option A, flagged for your ruling**: pipeline-ui's
`dist/style.css` import is kept (it's the only one left in
`src/nativeModuleRegistrations.ts`), specifically for its non-utility content. Its
residual *utility* classes inside that same file are harmless duplicates: this import
already sits before `./styles/index.css` in `main.tsx`'s source order (via
`nativeModuleRegistrations.ts`), so the shell's new consolidated stylesheet still
loads after it and wins any same-specificity utility tie, same mechanism that fixes
everything else. Verified directly: `.react-flow__edge.animated` and `@keyframes
dashdraw` both survive, byte-identical, in the prototype's built CSS.

### The change

- `tailwind.config.ts`: `content` gains `"./node_modules/@projectbooth/*-ui/dist/**/*.js"`.
- `src/nativeModuleRegistrations.ts`: removed 6 of 7 `import ".../dist/style.css"`
  lines (kept pipeline-ui's, see above).

### Verification, same two methods as §1, against the prototype build

Rule order flips as expected:

```
.dark\:bg-slate-950  -> rule index 683
.bg-white             -> rule index 446   (683 > 446: dark now wins)
.dark\:bg-amber-950  -> rule index 666
.bg-amber-100         -> rule index 411   (666 > 411: dark now wins)
```

Full in-app screenshots, same harness, same fixtures, all 7 modules × both themes:
`qa-investigation/screenshots/after/`. Dark mode: `storage-browse`, `storage-admin`,
`logging` now render `rgb(2,6,23)` (slate-950) / `rgb(69,26,3)` (amber-950) — correct.
Light mode: identical to `before/` — `rgb(255,255,255)` / `rgb(254,243,199)`,
unchanged. `catalog`/`database`/`pipeline`/`lakehouse` unaffected either way, no new
console errors in either theme.

`npm run typecheck`, `npm run lint`, `npm test -- --run` (74/74, unchanged — jsdom
can't see this bug either way, correctly) and `npm run build` all pass against the
prototype.

## 3. Option B — higher-specificity dark selector, all 7 republished

**What it would take.** Tailwind's `:where(...)` wrapper is what zeroes the dark
variant's specificity; the standard way around it is switching the `darkMode` selector
strategy to something that doesn't zero out (e.g. doubling the attribute selector, or
an `:is(...)`-based form) so `.dark\:bg-slate-950[data-theme="dark"][data-theme="dark"]`-
style output outweighs a plain `.bg-white` regardless of source order. That change has
to happen identically in all seven module repos' `web/tailwind.config.js` *and* this
shell's `tailwind.config.ts` — the existing comment ("MUST match ... exactly") is
exactly the constraint that makes this unavoidable, since a mismatched selector would
mean each module's own `dark:` classes stop responding to this shell's `data-theme`
attribute at all. That's 7 version bumps + republishes (coordinated across repos
outside this one) + 7 pin bumps back in this repo's `package.json`, versus option A's
single-repo change.

**Would it fix the responsive-variant risk? No — confirmed, not just taken on your
word.** A `@media` query contributes **zero** selector specificity by the CSS
specification; it's a conditional wrapper around the rule, not part of the selector
being scored. A higher-specificity *dark-mode* selector only raises the specificity of
rules using that specific `[data-theme="dark"]` attribute-selector mechanism — it does
nothing for a `md:` (or any other breakpoint) utility, which has no analogous attribute
selector to inflate. Two modules' `md:px-4` vs. a third module's plain `.px-4` would
remain tied at (0,1,0) each and still purely source-order-dependent after option B,
exactly as before it. Option A doesn't have this gap, because it isn't a
dark-mode-specific fix at all — it fixes the general "N separate Tailwind builds
concatenated" problem by making it one build, so *every* equal-specificity variant
pair (not just dark:) gets Tailwind's own base-before-variant ordering guarantee.

## 4. Regression guard

**Needs a real browser — confirmed, this isn't a hunch.** Tried reproducing via
`getComputedStyle` first against jsdom-rendered output before building the Playwright
harness: jsdom has no CSS cascade/specificity engine at all, so a jsdom assertion
against computed style either reads nothing meaningful or silently passes regardless
of real rule order — `src/__tests__/nativeModules.integration.test.tsx` already mounts
all 7 real modules in jsdom today and passed on both the buggy and fixed CSS without
change, which is the demonstration: it cannot catch this class of bug, full stop, no
matter what's asserted in it.

**Proposed check**: generalize `qa-investigation/verify-static.mjs` into a permanent
script — load the real built `dist/assets/*.css` in headless Chromium, for each
element carrying any `dark:bg-*` class (scan isn't limited to the two classes named in
this bug — this generalizes to any `dark:bg-*`), set `data-theme="dark"`, and fail if
its computed `background-color` equals its light-mode computed `background-color`. No
app mounting required for this form of the check — it's a pure static-CSS assertion
against known class-name fixtures per module (or, more robustly, scraped from each
module's own `dist/style.css` source before it's dropped, so the check doesn't rot
silently if a module renames a class), so it's cheap and has no backend/auth
dependency.

**Where it belongs: booth-design's CI, as a new job alongside `test`/`helm`/`image` —
not booth-e2e.** Reasoning, not just a preference:

- The bug is 100% reproducible from this repo's own build output alone, as §1 and §2
  demonstrated — no running booth-core, no droplet, no other repo needed. It's a
  static-asset-correctness property of *this repo's* build process.
- It needs to catch the failure mode that actually caused this bug: a dependency bump
  (exactly the shape of the `database-ui` 0.1.2→0.1.3 bump done earlier this session)
  changing which classes a module's build emits, or a new module's own Tailwind build
  introducing a fresh same-specificity collision. That has to run on every PR to this
  repo, which is booth-design's own CI, not booth-e2e's slower, less-frequently-
  triggered full-system cadence.
- booth-e2e remains valuable as a complementary live-environment check (confirms the
  *actually deployed* container serves the same CSS this repo's build produced) but
  shouldn't be the *only* place this is caught, since by the time a problem surfaces
  there, it's already several steps removed from the PR that introduced it.

Needs a new, separate CI job (not folded into `test`, which runs under `jsdom` and
has no browser binary) — installing Chromium adds real job time (~115MB download, as
seen installing it for this investigation), so split it out the same way `image` is
already split from `test`, and gate it as a required check the same way.

## Summary of what disagrees with, or adds to, the original diagnosis

Nothing contradicts the core diagnosis — it reproduced exactly as described, down to
the rule-order mechanism and the `md:`-breakpoint generalization. Two things to weigh
in the ruling that weren't in the original ask:

1. **pipeline-ui needs a carve-out** from "stop importing the modules' separate
   dist/style.css for utilities" — it ships real, non-utility vendor CSS
   (`@xyflow/react`'s base stylesheet) inseparably bundled alongside its utilities at
   this layer. The prototype keeps importing it for that reason; a cleaner long-term
   fix would be pipeline-ui's own build separating vendor CSS from Tailwind output,
   which is out of scope for this repo.
2. **Option A's fix is more general than "fix dark mode"** — it resolves the whole
   class of equal-specificity cross-module ordering bugs, `md:` included, as a
   mechanical consequence of there being one Tailwind build instead of eight. Worth
   weighing against option B, which only ever fixes the dark-mode axis specifically.
