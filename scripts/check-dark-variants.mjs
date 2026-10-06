#!/usr/bin/env node
// Regression guard for the dark-mode cascade bug (ADR 0097). Checks the ACTUAL built
// shell CSS (dist/assets/*.css from `npm run build`) in a real browser -- jsdom has no
// CSS cascade/specificity engine, so it cannot see this class of bug at all, which is
// why this needs Chromium and runs as its own CI job, not inside the jsdom `test` job.
//
// Pairs are scraped from each @projectbooth/*-ui package's OWN built bundle
// (node_modules/@projectbooth/*-ui/dist/index.js), not hardcoded: every class-name
// string literal containing a `dark:bg-*` token is a candidate, and any plain `bg-*`
// token co-occurring in that SAME string is taken as its light-mode counterpart --
// exactly the shape every real instance of this bug had (e.g. "bg-white align-top
// dark:bg-slate-950"). A module adding, removing, or renaming a dark:bg-* class is
// picked up automatically on the next run; nothing here needs updating by hand.
//
// Failure condition, directly: for a scraped (base, dark) pair, if the SAME element's
// computed background-color is identical whether `data-theme="dark"` is set or not --
// despite the two utilities naming genuinely different colors -- the dark variant had
// no effect, which is this bug's exact signature.

import { chromium } from "playwright";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function findBuiltCss() {
  const assetsDir = path.join(repoRoot, "dist", "assets");
  let files;
  try {
    files = readdirSync(assetsDir);
  } catch {
    throw new Error(`dist/assets not found -- run \`npm run build\` before this script (looked in ${assetsDir})`);
  }
  const cssFile = files.find((f) => f.startsWith("index-") && f.endsWith(".css"));
  if (!cssFile) throw new Error(`No built index-*.css found in ${assetsDir}`);
  return path.join(assetsDir, cssFile);
}

/** Scrapes (base, dark) class-name pairs from one module package's built bundle. */
function scrapePairsFromModule(pkgDir) {
  const jsPath = path.join(pkgDir, "dist", "index.js");
  let src;
  try {
    src = readFileSync(jsPath, "utf8");
  } catch {
    return [];
  }

  const pairs = [];
  const seen = new Set();
  // Matches quoted string literals (the compiled form of a JSX className) containing a
  // dark:bg-* token -- the same shape Tailwind's own content scanner looks for.
  const stringLiteralRe = /["']([^"'\\]*dark:bg-[^"'\\]*)["']/g;
  let m;
  while ((m = stringLiteralRe.exec(src))) {
    const tokens = m[1].split(/\s+/);
    const darkTokens = tokens.filter((t) => /^dark:bg-[\w-]+$/.test(t));
    const baseTokens = tokens.filter((t) => /^bg-[\w-]+$/.test(t));
    if (darkTokens.length === 0) continue;
    for (const dark of darkTokens) {
      const darkSuffix = dark.slice("dark:bg-".length);
      // Same-string companion `bg-*` token is this pair's real light-mode color, per
      // every real instance of this bug -- not a guess, read straight from the markup.
      const base = baseTokens.find((b) => b.slice("bg-".length) !== darkSuffix) ?? baseTokens[0];
      if (!base) continue; // no plain bg-* companion in this string -- nothing to pair against
      const key = `${base}|${dark}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ base, dark });
    }
  }
  return pairs;
}

function scrapeAllPairs() {
  const scopeDir = path.join(repoRoot, "node_modules", "@projectbooth");
  const byModule = [];
  for (const name of readdirSync(scopeDir)) {
    if (!name.endsWith("-ui")) continue;
    const pairs = scrapePairsFromModule(path.join(scopeDir, name));
    if (pairs.length > 0) byModule.push({ module: name, pairs });
  }
  return byModule;
}

async function main() {
  const cssPath = findBuiltCss();
  const css = readFileSync(cssPath, "utf8");
  const byModule = scrapeAllPairs();
  const total = byModule.reduce((n, m) => n + m.pairs.length, 0);
  console.log(`Scraped ${total} dark:bg-*/bg-* pairs from ${byModule.length} module package(s).`);
  if (total === 0) {
    console.log("Nothing to check -- no module ships a dark:bg-* class paired with a bg-* class.");
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const divs = [];
  for (const { module, pairs } of byModule) {
    for (const { base, dark } of pairs) {
      divs.push({ module, base, dark, id: `t-${divs.length}` });
    }
  }
  const html = `<!doctype html><html><head><style>${css}</style></head><body>
    ${divs.map((d) => `<div id="${d.id}" class="${d.base} ${d.dark}"></div>`).join("\n")}
  </body></html>`;
  await page.setContent(html, { waitUntil: "load" });

  const lightColors = await page.evaluate(
    (ids) => ids.map((id) => getComputedStyle(document.getElementById(id)).backgroundColor),
    divs.map((d) => d.id),
  );
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  const darkColors = await page.evaluate(
    (ids) => ids.map((id) => getComputedStyle(document.getElementById(id)).backgroundColor),
    divs.map((d) => d.id),
  );

  await browser.close();

  const failures = [];
  for (let i = 0; i < divs.length; i++) {
    const d = divs[i];
    if (lightColors[i] === darkColors[i]) {
      failures.push({ ...d, color: lightColors[i] });
    }
  }

  console.log(`Checked ${divs.length} pair(s) against ${path.relative(repoRoot, cssPath)}.`);
  if (failures.length > 0) {
    console.error(`\nFAIL: ${failures.length} element(s) render their light-mode background in dark mode:\n`);
    for (const f of failures) {
      console.error(`  [${f.module}] class="${f.base} ${f.dark}" -> ${f.color} in both light and dark mode`);
    }
    console.error("\nThis is the dark-mode cascade bug (ADR 0097): a same-specificity rule declared");
    console.error("later in the built stylesheet is beating the dark: variant. Check tailwind.config.ts's");
    console.error("content glob still scans every @projectbooth/*-ui package, and that no module's");
    console.error("dist/style.css is being imported again for utilities (see nativeModuleRegistrations.ts).");
    process.exitCode = 1;
    return;
  }

  console.log(`PASS: all ${divs.length} pair(s) render their dark-mode color when data-theme="dark" is set.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
