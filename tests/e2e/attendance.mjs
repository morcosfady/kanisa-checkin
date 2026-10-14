// Run with the app in demo mode:  NEXT_PUBLIC_SUPABASE_URL= npx next dev -p 3055   then   node tests/e2e/attendance.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const base = process.env.BASE ?? "http://localhost:3055/en";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", acceptDownloads: true });
const page = await ctx.newPage();
let step = 0;
const ok = (m) => console.log(`ok ${++step} ${m}`);

await page.goto(`${base}/attendance`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Attendance Sheet" }).waitFor();
await page.waitForTimeout(2500); // let React hydrate
ok("page opens");

// period
await page.getByRole("combobox", { name: /^Period/ }).selectOption("4w");
await page.waitForFunction(() => location.search.includes("p=4w"));
await page.getByText(/Last 4 weeks/).first().waitFor();
ok("period changes to last 4 weeks");

// tier filter: the chip count matches the list
const chip = page.getByRole("button", { name: /^Absent \d+$/ });
const n = Number((await chip.textContent()).match(/\d+/)[0]);
await chip.click();
const total = await page.locator("ol > li").count();
assert.equal(total, Math.min(n, 25));
ok(`tier filter shows ${total} of ${n} absent members`);
await page.getByRole("button", { name: /^All \d+$/ }).click();

// add and remove a label on one member
const first = page.locator("ol > li").first();
const name = (await first.locator(".truncate.font-semibold").first().textContent()).trim();
await first.getByRole("button", { name: "Label" }).click();
await page.getByRole("dialog", { name: "Add a label" }).getByRole("button", { name: /Needs prayer/ }).click();
await first.getByText("Needs prayer").waitFor();
ok(`label added to ${name}`);
await first.getByRole("button", { name: "Remove Needs prayer" }).click();
await first.getByText("Needs prayer").waitFor({ state: "detached" });
ok("label removed");

// bulk add "Called" to two members
await page.getByLabel(/^Select /).nth(1).check();
await page.getByLabel(/^Select /).nth(2).check();
await page.getByText("2 selected").waitFor();
await page.getByRole("button", { name: "Add label to selected" }).click();
await page.getByRole("dialog", { name: "Add a label" }).getByRole("button", { name: /Called/ }).click();
await page.getByText("2 selected").waitFor({ state: "detached" });
const calledPills = await page.locator("ol > li .l-pill", { hasText: "Called" }).count();
assert.ok(calledPills >= 2);
ok("bulk label added to 2 members");

// snooze a follow-up
const panel = page.getByRole("region", { name: "Follow up needed" });
const before = Number((await panel.locator("h3 span").textContent()).trim());
assert.ok(before > 0, "demo data has follow-ups");
await panel.getByRole("button", { name: "Snooze" }).first().click();
await panel.getByRole("button", { name: "1 week" }).click();
await page.waitForFunction((b) => Number(document.querySelector('[aria-label="Follow up needed"] h3 span').textContent) === b - 1, before);
ok("snoozed follow-up leaves the list");

// manage labels: create one
await page.getByRole("button", { name: "Manage labels" }).click();
await page.getByRole("button", { name: "New label" }).click();
await page.getByLabel("Name (English)").fill("Choir helper");
await page.getByRole("button", { name: "Save label" }).click();
await page.getByText("Choir helper").first().waitFor();
await page.keyboard.press("Escape");
ok("new label created");

// member drawer
await page.locator("ol > li").first().click({ position: { x: 150, y: 20 } });
await page.getByRole("dialog").waitFor();
await page.keyboard.press("Escape");
ok("member drawer opens and closes");

// exports
const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export Excel" }).click()]);
assert.match(dl.suggestedFilename(), /^attendance-.*\.xlsx$/);
ok(`excel export: ${dl.suggestedFilename()}`);
await page.evaluate(() => { window.__printed = null; window.print = () => { window.__printed = document.body.dataset.print ?? "page"; }; });
await page.getByRole("button", { name: "Export PDF" }).click();
assert.equal(await page.evaluate(() => window.__printed), "report");
ok("PDF export opens the one-page report print");

// compact list
const tall = (await page.locator("ol > li").first().boundingBox()).height;
await page.getByRole("button", { name: "Compact" }).click();
const short = (await page.locator("ol > li").first().boundingBox()).height;
assert.ok(short < tall, `compact row (${short}) should be shorter than detailed (${tall})`);
await page.getByRole("button", { name: "Compact" }).click();
ok(`compact list: ${Math.round(short)}px per person instead of ${Math.round(tall)}px`);

// no dagger sign, deacons get a badge
assert.equal(await page.getByText("✝").count(), 0);
ok("no dagger sign next to names");

// phone width: no sideways scroll
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
ok("no horizontal page scroll at 390px");
await page.setViewportSize({ width: 1440, height: 900 });

// accessibility
const axe = await new AxeBuilder({ page }).include(".ledger-page").analyze();
const bad = axe.violations.filter((v) => ["serious", "critical"].includes(v.impact));
if (bad.length) console.log(bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nodes, e.g. ${v.nodes[0].html.slice(0, 120)}`).join("\n"));
assert.equal(bad.length, 0, "axe serious/critical violations");
ok("axe: no serious or critical issues");

// dark "ink" look
await page.getByRole("button", { name: "Use the dark ink look" }).click();
assert.equal(await page.locator(".ledger-page").getAttribute("data-ink"), "true");
const axeInk = await new AxeBuilder({ page }).include(".ledger-page").analyze();
const badInk = axeInk.violations.filter((v) => ["serious", "critical"].includes(v.impact));
if (badInk.length) console.log(badInk.map((v) => `${v.id}: ${v.nodes.length} e.g. ${v.nodes[0].html.slice(0, 120)}`).join(" | "));
assert.equal(badInk.length, 0, "axe (ink) serious/critical violations");
ok("axe in ink mode: no serious or critical issues");

await browser.close();
console.log("ALL PASSED");
