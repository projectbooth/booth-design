// Static verification: load the ACTUAL built shell CSS (from `npm run build`'s
// dist/assets/index-*.css) in a real browser, set data-theme="dark", and render
// literal markup copied verbatim from each module's own source for the elements the
// bug report named. Checks computed background-color, independent of any app/auth
// bootstrap -- the bug is purely in the static CSS cascade.
import { chromium } from "playwright";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const distAssets = path.resolve("D:/Projects/ProjectBooth/booth-design/dist/assets");
const cssFile = readdirSync(distAssets).find((f) => f.startsWith("index-") && f.endsWith(".css"));
const cssPath = path.join(distAssets, cssFile);
console.log("Using built CSS:", cssPath);

const html = `
<!doctype html>
<html data-theme="dark">
<head><style>${readFileSync(cssPath, "utf8")}</style></head>
<body style="background:#000">
  <table><tbody>
    <tr id="storage-browse-row" class="bg-white align-top dark:bg-slate-950"><td>cell</td></tr>
  </tbody></table>
  <table><tbody>
    <tr id="storage-admin-row" class="bg-white align-top dark:bg-slate-950"><td>cell</td></tr>
  </tbody></table>
  <span id="storage-amber-badge" class="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">s3</span>
  <ul>
    <li id="logging-row" class="bg-white dark:bg-slate-950">log line</li>
  </ul>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });

const ids = ["storage-browse-row", "storage-admin-row", "storage-amber-badge", "logging-row"];
console.log("\n=== dark mode computed backgrounds (data-theme=dark) ===");
for (const id of ids) {
  const bg = await page.$eval(`#${id}`, (el) => getComputedStyle(el).backgroundColor);
  console.log(id, "->", bg);
}

await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
console.log("\n=== light mode computed backgrounds (no data-theme) ===");
for (const id of ids) {
  const bg = await page.$eval(`#${id}`, (el) => getComputedStyle(el).backgroundColor);
  console.log(id, "->", bg);
}

await browser.close();

// Rule-order evidence straight from the built CSS text.
const css = readFileSync(cssPath, "utf8");
function ruleIndexOf(needle) {
  const offset = css.indexOf(needle);
  if (offset < 0) return { offset, index: -1 };
  return { offset, index: css.slice(0, offset).split("}").length - 1 };
}
console.log("\n=== rule order in built CSS ===");
for (const [label, needle] of [
  [".dark\\:bg-slate-950", "slate-950"],
  [".bg-white", ".bg-white{"],
  [".dark\\:bg-amber-950", "amber-950"],
  [".bg-amber-100", ".bg-amber-100{"],
]) {
  console.log(label, ruleIndexOf(needle));
}
