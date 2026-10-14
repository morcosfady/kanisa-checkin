import { chromium } from "playwright";
import fs from "node:fs";
const [, , out = "docs/screenshots/attendance", tag = "after"] = process.argv;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];
for (const [name, vp] of Object.entries({ "1440": { width: 1440, height: 900 }, "1280": { width: 1280, height: 800 }, "768": { width: 768, height: 1024 }, "390": { width: 390, height: 844 } })) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${name} console: ${m.text()}`));
  await page.goto("http://localhost:3055/en/attendance", { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(name, "horizontal overflow px:", over);
  await page.screenshot({ path: `${out}/${tag}-${name}.png`, fullPage: true });
  if (name === "1440") {
    await page.getByRole("button", { name: /parchment look/ }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${tag}-ink-1440.png`, fullPage: false });
  }
  await ctx.close();
}
await browser.close();
console.log(errors.slice(0, 8).join("\n") || "no console errors");
