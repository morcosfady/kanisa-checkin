// Accessibility (axe) + dark screenshots + rough background FPS. Run against a demo-mode server.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

const base = process.argv[2] ?? "http://localhost:3055";
const out = "docs/screenshots/after";
fs.mkdirSync(out, { recursive: true });
const pages = ["dashboard", "members", "kiosk", "approvals", "privacy", "login"];
const browser = await chromium.launch();

for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(`${base}/${p}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    if (theme === "dark") await page.screenshot({ path: `${out}/${p}-dark.png`, fullPage: true });
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const v = res.violations.map((x) => `${x.id} (${x.nodes.length})`);
    console.log(`${theme} ${p}: ${v.length ? v.join(", ") : "no violations"}`);
  }
  await ctx.close();
}

// rough FPS of the page while the sacred background runs (headless, so only indicative)
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
const fps = await page.evaluate(
  () => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 3000 ? requestAnimationFrame(f) : r(Math.round(n / 3)); }; requestAnimationFrame(f); }),
);
console.log(`page rAF rate with background: ${fps} fps`);
await browser.close();
