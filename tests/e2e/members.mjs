// Demo mode:  NEXT_PUBLIC_SUPABASE_URL= npx next dev -p 3055   then   node tests/e2e/members.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const base = process.env.BASE ?? "http://localhost:3055/en";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
let step = 0;
const ok = (m) => console.log(`ok ${++step} ${m}`);

await page.goto(`${base}/members`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.locator("tbody tr").first().click();
const drawer = page.getByRole("dialog");
await drawer.waitFor();
ok("profile panel opens");

// deacon toggle
const before = await drawer.getByText("Deacon", { exact: true }).count();
await drawer.getByRole("button", { name: /Make deacon|Remove deacon/ }).click();
await page.waitForTimeout(300);
assert.notEqual(await drawer.getByText("Deacon", { exact: true }).count(), before);
ok("deacon can be switched on or off");

// status
await drawer.getByRole("radio", { name: "Inactive" }).click();
await drawer.getByRole("radio", { name: "Inactive", checked: true }).waitFor();
ok("status changes to inactive");

// photo
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
await drawer.locator('input[type="file"]').setInputFiles({ name: "p.png", mimeType: "image/png", buffer: png });
await drawer.locator("img").first().waitFor();
ok("photo added");
await drawer.getByRole("button", { name: "Remove photo" }).click();
await drawer.locator("img").first().waitFor({ state: "detached" });
ok("photo removed");

// notes
await drawer.getByRole("tab", { name: /Notes/ }).click();
await drawer.getByLabel("New note").fill("Pray for his mother");
await drawer.getByRole("button", { name: "Add note" }).click();
await drawer.getByText("Pray for his mother").waitFor();
ok("note added");
await drawer.getByRole("tab", { name: /Notes/ }).click();
await drawer.getByRole("tab", { name: "Overview" }).click();
await drawer.getByText("Pray for his mother").waitFor();
ok("latest note is also shown on the overview");

const axe = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
const bad = axe.violations.filter((v) => ["serious", "critical"].includes(v.impact));
if (bad.length) console.log(bad.map((v) => `${v.id}: ${v.nodes[0].html.slice(0, 120)}`).join(" | "));
assert.equal(bad.length, 0);
ok("axe: no serious or critical issues");
await browser.close();
console.log("ALL PASSED");
