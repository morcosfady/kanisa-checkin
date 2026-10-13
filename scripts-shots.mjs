import { chromium } from "playwright";
import fs from "node:fs";
const [, , outDir, base = "http://localhost:3055"] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const pages = ["dashboard", "members", "kiosk", "approvals", "privacy", "login"];
const sizes = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };
const browser = await chromium.launch();
for (const [name, viewport] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(`${base}/${p}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${outDir}/${p}-${name}.png`, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
console.log("done");
