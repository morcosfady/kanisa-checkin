// Records the app in DEMO mode (fake data only) with smooth scripted moves.
// Start the app first:  NEXT_PUBLIC_SUPABASE_URL= npx next dev -p 3055   (from the repo root)
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3055/en";
const OUT = path.resolve("raw/screens");
fs.mkdirSync(OUT, { recursive: true });

const CURSOR = `
(() => {
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;z-index:2147483647;width:22px;height:22px;margin:-4px 0 0 -4px;border-radius:50%;background:rgba(201,162,74,.85);box-shadow:0 0 0 3px rgba(255,255,255,.7),0 0 18px 6px rgba(201,162,74,.55);pointer-events:none;left:-50px;top:-50px;transition:transform .12s";
  addEventListener("DOMContentLoaded", () => document.documentElement.appendChild(d));
  addEventListener("mousemove", (e) => { d.style.left = e.clientX + "px"; d.style.top = e.clientY + "px"; }, true);
  addEventListener("mousedown", () => (d.style.transform = "scale(.7)"), true);
  addEventListener("mouseup", () => (d.style.transform = "scale(1)"), true);
  const s = document.createElement("style");
  s.textContent = "nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display:none !important }";
  addEventListener("DOMContentLoaded", () => document.head.appendChild(s));
})();`;

async function session(name, viewport, scale, run, opts = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, recordVideo: { dir: path.join(OUT, "_tmp"), size: { width: viewport.width, height: viewport.height } } });
  await ctx.addInitScript(CURSOR);
  if (opts.member) await ctx.addCookies([{ name: "demo_role", value: "member", url: BASE }]);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const marks = [];
  const api = {
    page,
    wait: (ms) => page.waitForTimeout(ms),
    // gold callout for later: where something is, and when
    async mark(label, locator) {
      const box = await locator.first().boundingBox();
      if (box) marks.push({ t: (Date.now() - t0) / 1000, label, x: box.x / viewport.width, y: box.y / viewport.height, w: box.width / viewport.width, h: box.height / viewport.height });
    },
    async glide(locator, { dx = 0.5, dy = 0.5, steps = 28 } = {}) {
      await locator.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const box = await locator.first().boundingBox();
      await page.mouse.move(box.x + box.width * dx, box.y + box.height * dy, { steps });
    },
    async click(locator, o) { await api.glide(locator, o); await page.waitForTimeout(250); await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up(); },
    async scrollTo(y, ms = 1800) {
      await page.evaluate(([to, dur]) => new Promise((res) => {
        const from = scrollY, t = performance.now();
        const step = (n) => { const p = Math.min(1, (n - t) / dur), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; scrollTo(0, from + (to - from) * e); p < 1 ? requestAnimationFrame(step) : res(); };
        requestAnimationFrame(step);
      }), [y, ms]);
    },
    async type(locator, text) { await api.click(locator); await page.keyboard.type(text, { delay: 70 }); },
  };
  await page.mouse.move(viewport.width * 0.6, viewport.height * 0.6);
  await run(api);
  await page.waitForTimeout(600);
  const video = page.video();
  await ctx.close();
  fs.renameSync(await video.path(), path.join(OUT, `${name}.webm`));
  fs.writeFileSync(path.join(OUT, `${name}.marks.json`), JSON.stringify({ width: viewport.width, height: viewport.height, marks }, null, 2));
  await browser.close();
  console.log("recorded", name);
}

const only = process.argv.slice(2);
const want = (n) => only.length === 0 || only.includes(n);
const go = (p, u) => p.goto(`${BASE}${u}`, { waitUntil: "networkidle" });

// 1. phone: make a profile, then the profile form with the face consent
if (want("phone-signup")) await session("phone-signup", { width: 430, height: 900 }, 2, async (a) => {
  const p = a.page;
  await go(p, "/signup"); await a.wait(1200);
  await a.type(p.locator('input[name="first"]'), "Mina");
  await a.type(p.locator('input[name="last"]'), "Demo");
  await a.type(p.locator('input[name="email"]'), "mina@example.com");
  await a.mark("One time only", p.getByRole("heading").first());
  await a.wait(700);
  await go(p, "/welcome"); await a.wait(1200);
  await a.type(p.getByLabel(/First name/), "Mina");
  await a.type(p.getByLabel(/Last name/), "Demo");
  await a.click(p.getByRole("radio", { name: "Male" })); await a.wait(300);
  await a.type(p.getByLabel(/Phone/), "5550123");
  await a.scrollTo(520, 1600); await a.wait(500);
  await a.scrollTo(1100, 1600); await a.wait(600);
  const consent = p.getByText(/face/i).first();
  await a.mark("Your consent, your choice", consent);
  await a.scrollTo(1700, 1600); await a.wait(1400);
}, { member: true });

// 2. tablet kiosk: scan, welcome, then the other ways to check in
if (want("kiosk")) await session("kiosk", { width: 1194, height: 834 }, 1.6, async (a) => {
  const p = a.page;
  await p.addStyleTag({ content: "" }).catch(() => {});
  await go(p, "/kiosk"); await a.wait(1500);
  await p.addStyleTag({ content: "div:has(> span.rounded-full.bg-gold\\/20) { visibility: hidden }" });
  await a.mark("Scan frame", p.locator(".aspect-\\[4\\/3\\]"));
  await a.wait(900);
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => /Simulate a face/.test(b.textContent))?.click());
  await a.wait(500); await a.mark("Welcome by name", p.getByText(/Welcome,/));
  await a.wait(3200);
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => /Simulate unknown/.test(b.textContent))?.click());
  await a.wait(1800);
  await a.mark("Scan the QR code", p.getByText(/Scan with your phone/));
  await a.glide(p.getByText(/Scan with your phone/), { dx: 0.5, dy: 1.4 }); await a.wait(1600);
  await a.mark("Or type the 3-digit code", p.getByText(/type today/i));
  await a.glide(p.getByText(/type today/i), { dx: 0.5, dy: 1.6 }); await a.wait(2200);
});

// 3. Today
if (want("today")) await session("today", { width: 1440, height: 900 }, 1.4, async (a) => {
  const p = a.page;
  await go(p, "/dashboard"); await a.wait(1500);
  await a.mark("Live: who is here", p.getByText(/Checked in/).first());
  await a.glide(p.getByText(/Checked in/).first()); await a.wait(2200);
  await a.mark("Arrival times", p.getByText(/Checked in/i).nth(1));
  await a.scrollTo(520, 2400); await a.wait(2600);
  await a.scrollTo(0, 1200); await a.wait(1200);
});

// 4. Members
if (want("members")) await session("members", { width: 1440, height: 900 }, 1.4, async (a) => {
  const p = a.page;
  await go(p, "/members"); await a.wait(1800);
  await a.type(p.getByPlaceholder(/Search name/), "an"); await a.wait(1000);
  await p.getByPlaceholder(/Search name/).fill(""); await a.wait(300);
  await a.click(p.getByRole("button", { name: "Deacon", exact: true })); await a.mark("Deacon badges", p.getByRole("button", { name: "Deacon", exact: true })); await a.wait(1400);
  await a.click(p.getByRole("button", { name: "Deacon", exact: true })); await a.wait(600);
  await a.click(p.locator("tbody tr").nth(1)); await a.wait(1400);
  await a.mark("Consent and notes", p.getByRole("tab", { name: "Notes" }));
  await a.click(p.getByRole("tab", { name: /Notes/ })); await a.wait(700);
  await a.type(p.getByLabel("New note"), "Pray for his mother"); await a.wait(500);
  await a.click(p.getByRole("button", { name: "Add note" })); await a.wait(1800);
});

// 5. Attendance sheet (the highlight)
if (want("attendance")) await session("attendance", { width: 1440, height: 900 }, 1.4, async (a) => {
  const p = a.page;
  await go(p, "/attendance"); await a.wait(3200);
  await a.mark("Abouna's summary", p.getByText(/Abouna’s summary/i));
  await a.wait(1500);
  await a.scrollTo(520, 2200); await a.wait(1800);
  await a.scrollTo(1300, 2400); await a.wait(1800);
  await a.mark("The register", p.getByText(/The register/i));
  await a.scrollTo(1900, 2000); await a.wait(2200);
  await a.mark("Who attends, ranked", p.getByText(/Who attends/i));
  await a.scrollTo(2500, 2200); await a.wait(2200);
  await a.scrollTo(3100, 2200); await a.wait(1800);
});

// 6. Labels and follow-up
if (want("labels")) await session("labels", { width: 1440, height: 900 }, 1.4, async (a) => {
  const p = a.page;
  await go(p, "/attendance"); await a.wait(2500);
  await a.scrollTo(2150, 1600); await a.wait(1200);
  const follow = p.getByRole("region", { name: "Follow up needed" });
  await a.mark("Follow up needed", follow);
  await a.glide(follow); await a.wait(1400);
  await a.click(follow.getByRole("button", { name: "Called" }).first()); await a.wait(1400);
  await a.click(follow.getByRole("button", { name: "Snooze" }).first()); await a.wait(900);
  await a.click(p.getByRole("button", { name: "1 week" })); await a.wait(1400);
  const row = p.locator("ol > li").nth(2);
  await a.click(row.getByRole("button", { name: "Label" })); await a.wait(900);
  await a.mark("Add a label", p.getByRole("dialog", { name: "Add a label" }));
  await a.click(p.getByRole("dialog", { name: "Add a label" }).getByRole("button", { name: /Needs prayer/ })); await a.wait(1600);
  await a.scrollTo(2500, 1600); await a.wait(1200);
  await a.mark("Welcome back, new, birthdays", p.getByRole("region", { name: /Welcome back/ }));
  await a.wait(1800);
});

// 7. Reports, access, church switcher
if (want("reports")) await session("reports", { width: 1440, height: 900 }, 1.4, async (a) => {
  const p = a.page;
  await go(p, "/attendance"); await a.wait(2600);
  await p.evaluate(() => { window.print = () => {}; });
  await a.mark("Export PDF", p.getByRole("button", { name: "Export PDF" }));
  await a.glide(p.getByRole("button", { name: "Export PDF" })); await a.wait(1300);
  await a.mark("Export Excel", p.getByRole("button", { name: "Export Excel" }));
  await a.glide(p.getByRole("button", { name: "Export Excel" })); await a.wait(1300);
  await go(p, "/approvals"); await a.wait(1600);
  await a.mark("Admin access, one church each", p.getByText(/Admin access/i).first());
  await a.glide(p.getByText(/Admin access/i).first()); await a.wait(1600);
  await a.mark("Switch church", p.getByRole("button", { name: "Switch church" }));
  await a.glide(p.getByRole("button", { name: "Switch church" })); await a.wait(1800);
});
