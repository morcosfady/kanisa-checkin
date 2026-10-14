// Generates the animated-style pictures (Nano Banana) and the optional Veo clip.
// Needs GEMINI_API_KEY in the environment. Run:  node scripts/images.mjs [images|clips]
// The same priest character is kept by passing the first priest picture (a3) as a reference for the later ones.
import fs from "node:fs";
import path from "node:path";

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.log("GEMINI_API_KEY is missing. Set it and run again (nothing was generated).");
  process.exit(0);
}
const scenes = JSON.parse(fs.readFileSync("scenes.json", "utf8"));
const IMG = "raw/images", CLIPS = "raw/clips";
fs.mkdirSync(IMG, { recursive: true });
fs.mkdirSync(CLIPS, { recursive: true });
const what = process.argv[2] ?? "images";
const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const base = "https://generativelanguage.googleapis.com/v1beta";

const parts = scenes.flatMap((s) => (s.visual.type === "mix" ? s.visual.parts : [s.visual])).filter((v) => v.file && v.prompt);
const PRIEST_REF = "a3-abouna-desk.png";

async function image(v) {
  const out = path.join(IMG, v.file);
  if (fs.existsSync(out)) return console.log("have", v.file);
  const content = [{ text: v.prompt + " Aspect ratio 16:9." }];
  const needsPriest = /priest/i.test(v.prompt) && v.file !== PRIEST_REF && fs.existsSync(path.join(IMG, PRIEST_REF));
  if (needsPriest) content.unshift({ inlineData: { mimeType: "image/png", data: fs.readFileSync(path.join(IMG, PRIEST_REF)).toString("base64") } }, { text: "Keep the same priest character as in this reference picture." });
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${base}/models/${model}:generateContent?key=${key}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: content }] }) });
    if (!res.ok) { console.log("error", res.status, v.file); continue; }
    const j = await res.json();
    const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (img) { fs.writeFileSync(out, Buffer.from(img.inlineData.data, "base64")); console.log("made", v.file); return; }
  }
  console.log("FAILED", v.file);
}

async function clip(v) {
  const out = path.join(CLIPS, v.clip);
  if (fs.existsSync(out)) return console.log("have", v.clip);
  const m = process.env.VEO_MODEL ?? "veo-3.0-generate-preview";
  const start = await fetch(`${base}/models/${m}:predictLongRunning?key=${key}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ instances: [{ prompt: v.prompt }], parameters: { aspectRatio: "16:9" } }) });
  if (!start.ok) return console.log("veo error", start.status);
  const op = (await start.json()).name;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    const j = await (await fetch(`${base}/${op}?key=${key}`)).json();
    if (j.done) {
      const uri = j.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) return console.log("veo returned no video");
      const vid = await fetch(`${uri}&key=${key}`);
      fs.writeFileSync(out, Buffer.from(await vid.arrayBuffer()));
      return console.log("made", v.clip);
    }
  }
}

if (what === "images") { for (const v of parts.sort((a, b) => (a.file === PRIEST_REF ? -1 : b.file === PRIEST_REF ? 1 : 0))) await image(v); }
else for (const v of parts.filter((x) => x.clip)) await clip(v);
