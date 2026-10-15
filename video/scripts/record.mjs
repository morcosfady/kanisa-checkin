// Records the app in DEMO mode (fake data only) with smooth scripted moves.
// Start the app first:  NEXT_PUBLIC_SUPABASE_URL= npx next dev -p 3055   (from the repo root)
import fs from "node:fs";
const require_fs = fs;
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

// 8. phone: type the daily code, then the history page (member view)
if (want("phone-checkin")) await session("phone-checkin", { width: 430, height: 900 }, 1, async (a) => {
  const p = a.page;
  await go(p, "/check-in"); await a.wait(1800);
  await a.mark("The 3-digit code", p.getByRole("group", { name: "3-digit check-in code" }));
  for (const [i, d] of ["4", "8", "2"].entries()) await a.type(p.getByLabel(`Digit ${i + 1}`), d);
  await a.wait(2400);
  await go(p, "/history"); await a.wait(1800);
  await a.scrollTo(300, 1800); await a.wait(1400);
  await a.scrollTo(0, 1200); await a.wait(1200);
}, { member: true });

// 9. laptop: weekly events and the services each church offers
if (want("schedule")) await session("schedule", { width: 1440, height: 900 }, 1, async (a) => {
  const p = a.page;
  await go(p, "/schedule"); await a.wait(1800);
  await a.mark("Weekly events", p.getByRole("heading", { name: "Weekly events" }));
  await a.glide(p.getByRole("heading", { name: "Weekly events" })); await a.wait(1800);
  await a.scrollTo(520, 2000); await a.wait(1400);
  await a.mark("Your church's own services", p.locator("#kinds"));
  await a.scrollTo(1100, 2000); await a.wait(2200);
  await a.scrollTo(1500, 1600); await a.wait(1400);
});

// 10. attendance, slow and in three parts so each part matches its narration
if (want("attendance2")) await session("attendance2", { width: 1440, height: 900 }, 1, async (a) => {
  const p = a.page;
  const phases = {};
  const t0 = Date.now();
  const phase = (n) => (phases[n] = Math.round((Date.now() - t0) / 100) / 10);
  await go(p, "/attendance"); await a.wait(3500);
  phase("c4");
  await a.mark("Abouna's summary", p.getByText(/Abouna’s summary/i));
  await a.glide(p.getByText(/Abouna’s summary/i)); await a.wait(3500);
  for (const t of ["Average per service", "Attendance rate", "Faithful members", "Need follow-up"]) {
    const tile = p.getByText(new RegExp(t)).first();
    await a.mark(t === "Faithful members" ? "Attends every week" : t, tile);
    await a.glide(tile); await a.wait(2300);
  }
  await a.wait(1500);
  phase("c5");
  await a.scrollTo(560, 1800); await a.wait(2600);
  await a.scrollTo(840, 1800); await a.wait(3000);
  await a.scrollTo(1100, 1800); await a.wait(3200);
  await a.mark("Arrival time", p.getByText(/Arrival time/i).first());
  await a.wait(3200);
  await a.mark("Men, women and deacons", p.getByText(/Men, women and deacons/i).first());
  await a.wait(2600);
  phase("c6");
  await a.scrollTo(1560, 2200); await a.wait(2200);
  await a.mark("The register", p.getByText(/The register/i).first());
  await a.wait(4200);
  await a.scrollTo(2150, 2200); await a.wait(2200);
  await a.mark("Ranked, with medals", p.getByText(/Who attends/i).first());
  await a.wait(3500);
  await a.click(p.getByRole("button", { name: "Compact" })); await a.mark("Compact view", p.getByRole("button", { name: "Compact" })); await a.wait(3200);
  await a.click(p.getByRole("button", { name: "Compact" })); await a.wait(1600);
  await a.scrollTo(2500, 2000); await a.wait(2600);
  phase("end");
  require_fs.writeFileSync(path.join(OUT, "attendance2.phases.json"), JSON.stringify(phases));
});

// 11. members: add a member, then the profile tabs
if (want("members2")) await session("members2", { width: 1440, height: 900 }, 1, async (a) => {
  const p = a.page;
  await go(p, "/members"); await a.wait(1800);
  await a.mark("Add member", p.getByRole("button", { name: "Add member" }));
  await a.click(p.getByRole("button", { name: "Add member" })); await a.wait(1500);
  await a.type(p.getByLabel(/First name/), "Mariam"); await a.type(p.getByLabel(/Last name/), "Guirguis");
  await a.mark("Parents can sign for children", p.getByText(/consent/i).first());
  await a.wait(2400);
  await p.keyboard.press("Escape"); await a.wait(900);
  await a.click(p.locator("tbody tr").nth(2)); await a.wait(2200);
  const dlg = p.getByRole("dialog");
  await a.mark("Quick actions", dlg.getByRole("button", { name: /Make deacon|Remove deacon/ }));
  await a.glide(dlg.getByRole("button", { name: /Make deacon|Remove deacon/ })); await a.wait(2000);
  await a.click(dlg.getByRole("radio", { name: "Visitor" })); await a.wait(1500);
  await a.click(dlg.getByRole("tab", { name: /Notes/ })); await a.wait(1800);
  await a.click(dlg.getByRole("tab", { name: "Attendance" })); await a.wait(1800);
  await a.click(dlg.getByRole("tab", { name: "Consent" })); await a.wait(1800);
  await a.mark("Enroll or withdraw face", dlg.getByRole("button", { name: /Enroll face|Re-enroll face/ }));
  await a.glide(dlg.getByRole("button", { name: /Enroll face|Re-enroll face/ })); await a.wait(2400);
});

// 12. kiosk: the hidden way out
if (want("kiosk-exit")) await session("kiosk-exit", { width: 1194, height: 834 }, 1, async (a) => {
  const p = a.page;
  await go(p, "/kiosk"); await a.wait(2000);
  await p.addStyleTag({ content: "div:has(> span.rounded-full.bg-gold\\/20) { visibility: hidden }" });
  const logo = p.locator("header span.select-none").first();
  await a.mark("Press and hold the logo", logo);
  const box = await logo.boundingBox();
  await p.mouse.move(box.x + 10, box.y + 10, { steps: 25 }); await a.wait(500);
  await p.mouse.down(); await a.wait(2600); await p.mouse.up();
  await a.mark("Then the admin password", p.getByRole("dialog", { name: "Exit kiosk" }));
  await a.wait(3200);
  await p.getByRole("button", { name: "Cancel" }).click(); await a.wait(1500);
});

// 13. Today: not here yet, check in by hand
if (want("today2")) await session("today2", { width: 1440, height: 900 }, 1, async (a) => {
  const p = a.page;
  await go(p, "/dashboard"); await a.wait(1500);
  await a.scrollTo(700, 2000); await a.wait(1400);
  const box = p.getByText(/Not here yet/i).first();
  await a.mark("Not here yet", box);
  await a.glide(box); await a.wait(1800);
  const btn = p.getByRole("button", { name: "Check in" }).first();
  await a.mark("One tap to check in by hand", btn);
  await a.click(btn); await a.wait(2600);
  await a.scrollTo(0, 1500); await a.wait(1500);
});

// 14. manage labels
if (want("labels2")) await session("labels2", { width: 1440, height: 900 }, 1, async (a) => {
  const p = a.page;
  await go(p, "/attendance"); await a.wait(2600);
  await a.mark("Manage labels", p.getByRole("button", { name: "Manage labels" }));
  await a.click(p.getByRole("button", { name: "Manage labels" })); await a.wait(2000);
  const dlg = p.getByRole("dialog", { name: "Manage labels" });
  await a.glide(dlg.getByText(/Follow up needed/).first()); await a.wait(1800);
  await a.click(dlg.getByRole("button", { name: "New label" })); await a.wait(1200);
  await a.type(p.getByLabel("Name (English)"), "Choir helper"); await a.wait(400);
  await a.click(p.getByRole("button", { name: "Color #4F5BB5" })); await a.wait(600);
  await a.click(p.getByRole("button", { name: "🎶" })); await a.wait(600);
  await a.mark("Excuses from follow-up", p.getByText(/Excuses the person/));
  await a.click(p.getByText(/Excuses the person/)); await a.wait(1600);
  await a.click(p.getByRole("button", { name: "Save label" })); await a.wait(2200);
});

// 15. attendance filters
if (want("attendance3")) await session("attendance3", { width: 1440, height: 900 }, 1, async (a) => {
  const p = a.page;
  await go(p, "/attendance"); await a.wait(3000);
  await a.mark("Pick any period", p.getByRole("combobox", { name: /^Period/ }));
  await a.glide(p.getByRole("combobox", { name: /^Period/ })); await a.wait(1500);
  await p.getByRole("combobox", { name: /^Service/ }).selectOption({ index: 2 }); await a.wait(2000);
  await a.mark("One service", p.getByRole("combobox", { name: /^Service/ }));
  await a.wait(1400);
  await p.getByRole("combobox", { name: /^Group/ }).selectOption("deacons"); await a.wait(2200);
  await a.mark("One group", p.getByRole("combobox", { name: /^Group/ }));
  await a.wait(1400);
  await p.getByRole("combobox", { name: /^Service/ }).selectOption(""); await p.getByRole("combobox", { name: /^Group/ }).selectOption("all"); await a.wait(1200);
  await a.scrollTo(700, 1800); await a.wait(1400);
  const tableBtn = p.getByRole("button", { name: /Table/ }).first();
  await a.mark("View as a table", tableBtn);
  await a.click(tableBtn); await a.wait(2600); await a.click(tableBtn); await a.wait(1400);
  await a.scrollTo(2150, 2000); await a.wait(1500);
  await a.click(p.getByRole("button", { name: /^Absent \d+$/ })); await a.mark("Click a tier to filter", p.getByRole("button", { name: /^Absent \d+$/ })); await a.wait(2800);
  await a.scrollTo(0, 1800); await a.wait(1200);
  await a.mark("Light or dark", p.getByRole("button", { name: /parchment look|dark ink look/ }));
  await a.click(p.getByRole("button", { name: /parchment look/ })); await a.wait(2600);
  await a.click(p.getByRole("button", { name: /dark ink look/ })); await a.wait(1400);
});

// 16. phone: ask to become an admin
if (want("phone-admin")) await session("phone-admin", { width: 430, height: 900 }, 1, async (a) => {
  const p = a.page;
  await go(p, "/profile"); await a.wait(1800);
  await a.scrollTo(2600, 2400); await a.wait(1400);
  const card = p.getByRole("heading", { name: /priest or church admin/i });
  await a.mark("Request admin access", card);
  await a.glide(card); await a.wait(1600);
  await a.type(p.getByLabel("Church").last(), "Philopat"); await a.wait(1200);
  await p.getByRole("option").first().click().catch(() => {}); await a.wait(800);
  await a.click(p.getByRole("button", { name: "Request admin access" })); await a.wait(2400);
}, { member: true });

// 17. approvals
if (want("approvals2")) await session("approvals2", { width: 1440, height: 900 }, 1, async (a) => {
  const p = a.page;
  await go(p, "/approvals"); await a.wait(2000);
  await a.mark("Approve or decline", p.getByRole("button", { name: "Approve" }));
  await a.glide(p.getByRole("button", { name: "Approve" })); await a.wait(1800);
  await a.click(p.getByRole("button", { name: "Approve" })); await a.wait(2000);
  await a.mark("Invite by email", p.getByPlaceholder("name@example.com"));
  await a.type(p.getByPlaceholder("name@example.com"), "newpriest@example.com"); await a.wait(800);
  await a.click(p.getByRole("button", { name: "Grant admin access" })); await a.wait(2200);
  await a.scrollTo(500, 1600); await a.wait(1800);
});

// 18. the one-page report as a picture
if (want("report")) {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 2 })).newPage();
  await page.goto(`${BASE}/attendance`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { document.body.dataset.print = "report"; });
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(800);
  fs.mkdirSync("raw/images", { recursive: true });
  await page.locator(".print-report").screenshot({ path: "raw/images/report-page.png" });
  await browser.close();
  console.log("report picture saved");
}
