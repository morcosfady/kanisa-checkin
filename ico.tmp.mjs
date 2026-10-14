import { chromium } from "playwright";
import fs from "node:fs";
const svg = fs.readFileSync("src/app/icon.svg", "utf8");
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 48, height: 48 } });
await page.setContent(`<body style="margin:0;background:transparent">${svg.replace("<svg ", '<svg width="48" height="48" ')}</body>`);
await page.screenshot({ path: "public/favicon.ico", omitBackground: true });
await b.close();
