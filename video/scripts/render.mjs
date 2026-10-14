// node scripts/render.mjs [still | frame <n> | vframe <n> | vertical | full]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const what = process.argv[2] ?? "full";
// the headless shell that Playwright already installed (Remotion needs a headless Chrome)
const pw = path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
const shell = fs.readdirSync(pw).find((d) => d.startsWith("chromium_headless_shell-"));
const browser = path.join(pw, shell, "chrome-headless-shell-win64", "chrome-headless-shell.exe");
const common = ["--browser-executable", browser, "--concurrency", "4", "--log", "error"];
const run = (args) => execFileSync("npx", args, { stdio: "inherit", shell: true });
fs.mkdirSync("out/frames", { recursive: true });
// two-pass-free loudness normalise to about -14 LUFS
const norm = (inp, out) => run(["remotion", "ffmpeg", "-y", "-i", inp, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", out]);

if (what === "still") run(["remotion", "still", "src/index.ts", "Thumbnail", "out/thumbnail.png", ...common]);
else if (what === "frame") run(["remotion", "still", "src/index.ts", "Explainer", `out/frames/f${process.argv[3]}.png`, "--frame", process.argv[3], ...common]);
else if (what === "vframe") run(["remotion", "still", "src/index.ts", "Vertical", `out/frames/v${process.argv[3]}.png`, "--frame", process.argv[3], ...common]);
else if (what === "vertical") { run(["remotion", "render", "src/index.ts", "Vertical", "out/_vertical.mp4", ...common, "--crf", "20"]); norm("out/_vertical.mp4", "out/amoinee-short-vertical.mp4"); }
else { run(["remotion", "render", "src/index.ts", "Explainer", "out/_full.mp4", ...common, "--crf", "18"]); norm("out/_full.mp4", "out/amoinee-explainer-1080p.mp4"); }
