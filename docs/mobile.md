# Mobile / phone-friendly viewing

The coordinator's phone-friendly viewing brief (17 Nov 2026): Booth supports **viewing**
on a phone browser. Building and admin screens stay desktop-only for now. Target widths
are 360-430px (phone portrait) plus 768px (tablet portrait); desktop (769px+) looks and
behaves exactly as it always has.

In scope: shell navigation, Home, Streamlit apps, Catalog, Logs, Pipelines (list/run
status/run detail), Settings. Out of scope for now: pipeline builder, notebooks,
Streamlit's own Edit form, API grants, Storage admin — those keep their current,
desktop-shaped page on a phone, plus a one-line note that the page needs a larger
screen (not built yet; flag it on the specific page if you own one of these).

This is a living doc for every `booth-*` module agent, not just booth-design — the
classes and components below are all shared, already in the one stylesheet every
module's UI is compiled through (ADR 0097) or published from `@projectbooth/design-ui`.
Add to this doc rather than inventing a parallel convention.

## Two different checks — don't conflate them

- **Viewport width** — `src/lib/useIsDesktop.ts`, `(min-width: 769px)`. Drives the shell
  chrome: below it, the nav rail becomes an off-canvas drawer (`MobileNav.tsx`); above
  it, nothing changes. 768px itself (the tablet-portrait target width) still gets the
  drawer — this is why the threshold is 769px, not Tailwind's own `md:` (768px).
- **Hover capability** — `src/lib/useHasHover.ts`, `(hover: hover)`. A touchscreen has
  no hover at all, regardless of its width (a 1024px tablet still has none); on iOS
  Safari specifically, a tap doesn't even focus a `<button>`, so hover- or
  focus-triggered UI (tooltips, hover-revealed actions) may never trigger at all on
  touch. Check this, not viewport width, for anything whose trigger today is hover or
  focus — see HelpHint below for the one place this shell already had to fix.

Reach for Tailwind's stock `sm:` (640px) for anything that's genuinely about available
space rather than either of the above (e.g. `.modal-sheet` below) — no custom
breakpoint needed there.

## Shell chrome

`ShellLayout` mounts exactly one of `NavRail` (desktop) or `MobileNav` (drawer) via
`useIsDesktop` — never both, so nav data-fetching and dropdown state exist once
regardless of viewport. Both render the same `NavRailContent`. The drawer is a Radix
Dialog: closes on route change, Esc, and outside tap, with its focus trapped while
open, all for free. Nothing for a module to adopt here — this is shell-owned chrome.

## Shared stylesheet classes

Hand-authored CSS in `@layer components` (`src/styles/index.css`), not Tailwind
utilities — ADR 0097 already compiles one stylesheet for this shell and every
registered native module together, so a module's own build never needs to reference
these class name strings for Tailwind's content scanner to find them (the way it would
for a utility class): there's only ever one `<style>` on the page, so any module's
markup can use these names directly, no import needed.

### `.table-scroll`

Wrap a `<table>` in this instead of a bare `overflow-x-auto` div:

```html
<div class="table-scroll">
  <table>…</table>
</div>
```

Adds a visible edge shadow that only shows on the side(s) there's actually more to
scroll to (the `background-attachment: local`/`scroll` trick — no JS scroll listener).
Never apply horizontal overflow to the page itself; this is the one place a table
should scroll. If the table sits on a background other than the page's own (inside a
card, say), override the mask color: `style="--table-scroll-bg: var(--color-bg-elevated)"`.

`src/components/ui/DataTable.tsx` already uses this.

### `.page-header`, `.action-row`, `.form-row`

A page's title-plus-actions row, a row of filter/sort/create buttons, and a horizontal
group of form fields — each wraps instead of overflowing or clipping once it doesn't
fit:

```html
<div class="page-header">
  <h1>Datasets</h1>
  <div class="action-row">
    <button>Filter</button>
    <button>New dataset</button>
  </div>
</div>
```

### `.modal-sheet`

Put this on a `Dialog.Content` (Radix or otherwise): a full-width sheet pinned to the
bottom of the screen under 640px, a normal modal above it — this is the one shared
class that uses Tailwind's own `sm` breakpoint rather than either check above, since
it's genuinely about available space, not device capability.

```html
<Dialog.Content class="modal-sheet ...">…</Dialog.Content>
```

Doesn't set `position` above 640px — your own centering (a flex/grid wrapper, Radix's
default) still applies there; this class only takes over positioning below the
breakpoint.

## HelpHint: tap instead of hover

`HelpHint`/`Tooltip` (`@projectbooth/design-ui`) used to rely solely on Radix
Tooltip's default hover/focus trigger. On a device with no hover, neither trigger
reliably fires (see above), so `HelpHint` now checks `useHasHover()`: with hover, it's
unchanged; without it, the tooltip is controlled and opens/closes on tap of the "?"
itself, closing again on a tap anywhere else. This is internal to `HelpHint` — nothing
for a consumer to change.

## Iframe-proxied apps (Streamlit, etc.)

`IframeProxyPane` already fills its pane correctly on a phone — it's `h-full`/`w-full`
inside `ShellLayout`'s own `h-dvh` flex layout (brief step 1), which already accounts
for iOS Safari's dynamic toolbar, and Tailwind's preflight resets `<iframe>` to
`display: block` so there's no stray inline-element gap. Nothing for a module to adopt
here either; two real gaps this shell owns and has fixed:

- **No body scroll behind the iframe.** `html`/`body` now set `overflow: hidden` and
  `overscroll-behavior: none` (`src/styles/index.css`) — on iOS Safari specifically, an
  iframe's own momentum scrolling can otherwise chain past its container and
  rubber-band the whole page behind it.
- **The 15-minute iframe session renewal (ADR 0069 item C) now survives a backgrounded
  tab.** The existing renewal timer alone wasn't enough on mobile: a phone browser can
  fully *suspend* a backgrounded tab's timers rather than merely throttle them, so the
  interval tick might never fire while Booth is in the background. `IframeProxyPane`
  now also renews immediately on `visibilitychange`/`focus` (the same pattern
  `useModules.ts` already uses for its own background poll), independent of the
  interval's own schedule.

Streamlit's own sidebar collapse, and anything else about a third-party app's own
in-iframe UI at a narrow width, is that app's business, not this shell's.

## Testing

- **The drawer's own mechanics** (open, close, focus, route change) are component
  tests, not a browser smoke: `src/components/nav/__tests__/MobileNav.test.tsx`.
- **`npm run smoke:mobile`** (`scripts/mobile-smoke.mjs`, its own CI job) boots the real
  app against its own dev server, network mocked at the Playwright layer (no real
  `booth-core` exists in CI), and drives the drawer exactly as a phone user would: open
  it, navigate to Home, Catalog, and a Streamlit-shaped iframe-proxy app, back to Home.
  Runs at both the phone target width (390px) and the tablet-portrait one (768px, still
  inside the drawer breakpoint), in light and dark, asserting none of them ever grows a
  horizontal scrollbar. This is a *shell* smoke test — Catalog is mocked only enough to
  render its list view (the same shapes `src/__tests__/nativeModules.integration.test.tsx`
  already proved correct against the real published package); asserting on Catalog's own
  internal correctness is that package's job, not this repo's.
