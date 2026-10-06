// INVESTIGATION-ONLY. Loads the real built harness page (served from dist/ via
// `vite preview`) for each module, in both themes, and screenshots it -- plus reports
// computed backgrounds for the specific elements the bug report named, read straight
// out of the live DOM (not static markup this time: the real mounted component).
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { installMocks } from "./mockRoutes.mjs";

const BASE = process.env.HARNESS_BASE ?? "http://localhost:4321";
const OUT = process.argv[2] ?? "qa-investigation/screenshots/before";
mkdirSync(OUT, { recursive: true });

const targets = [
  { mod: "storage", path: "/storage", label: "storage-browse" },
  { mod: "storage", path: "/storage/admin", label: "storage-admin" },
  { mod: "logging", path: "/logging", label: "logging" },
  { mod: "catalog", path: "/catalog", label: "catalog" },
  { mod: "database", path: "/database", label: "database" },
  { mod: "pipeline", path: "/pipeline", label: "pipeline" },
  { mod: "lakehouse", path: "/lakehouse", label: "lakehouse" },
];

const browser = await chromium.launch();
for (const theme of ["light", "dark"]) {
  for (const t of targets) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await installMocks(page);
    page.on("pageerror", (err) => console.log("PAGEERROR", theme, t.label, err.message));
    const url = `${BASE}/qa-investigation/harness.html?mod=${t.mod}&path=${encodeURIComponent(t.path)}&theme=${theme}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(150);
    const file = `${OUT}/${t.label}-${theme}.png`;
    await page.screenshot({ path: file });

    // Spot-check the two elements the bug report named, when present on this screen.
    const checks = await page.evaluate(() => {
      const results = [];
      for (const el of document.querySelectorAll('[class*="dark:bg-"]')) {
        const cls = el.className;
        if (typeof cls === "string" && /dark:bg-(slate|amber)-950/.test(cls)) {
          results.push({ tag: el.tagName, cls, bg: getComputedStyle(el).backgroundColor });
        }
      }
      return results;
    });
    console.log(theme, t.label, "->", file, JSON.stringify(checks));
    await page.close();
  }
}
await browser.close();
