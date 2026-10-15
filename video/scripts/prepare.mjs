// Builds src/data.json (scene timing, subtitle cues), copies media into public/, writes the SRT files and the Google Vids pack.
import fs from "node:fs";
import path from "node:path";

const FPS = 30, LEAD = 0.5, TAIL = 0.5;
const scenes = JSON.parse(fs.readFileSync("scenes.json", "utf8"));
// Flow prompts: file -> full prompt text
const fp = JSON.parse(fs.readFileSync("flow-prompts.json", "utf8"));
const PROMPT = Object.fromEntries(fp.images.map((i) => [i.file, `${fp.style} ${i.scene.replace("{priest}", fp.priest)} ${fp.tail}`]));
const rd = (p) => fs.readFileSync(p);
const exists = (p) => fs.existsSync(p);

function wavSeconds(file) {
  const b = rd(file);
  const byteRate = b.readUInt32LE(28);
  let i = 12;
  while (i < b.length - 8) { const id = b.toString("ascii", i, i + 4), sz = b.readUInt32LE(i + 4); if (id === "data") return sz / byteRate; i += 8 + sz + (sz % 2); }
  return b.length / byteRate;
}
const audioFile = (id) => ["mp3", "wav"].map((e) => `raw/audio/${id}.${e}`).find(exists);
import { execFileSync } from "node:child_process";
function mp3Seconds(file) {
  let txt = "";
  try { execFileSync("npx", ["remotion", "ffmpeg", "-i", file], { shell: true, stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { txt = String(e.stderr ?? "") + String(e.stdout ?? ""); }
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(txt);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 5;
}
const audioDur = (id) => { const f = audioFile(id); return f?.endsWith(".wav") ? wavSeconds(f) : f ? mp3Seconds(f) : 5; };

// subtitle chunks: at most ~64 characters, timed by share of characters
function chunk(text, max = 64) {
  const words = text.split(/\s+/), out = [];
  let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
  if (cur) out.push(cur);
  return out;
}

let t = 0;
const out = [];
for (const s of scenes) {
  const ad = audioDur(s.id);
  const dur = Math.max(s.minDur ?? 0, ad + LEAD + TAIL);
  const wf = `raw/audio/${s.id}.words.json`;
  const words = exists(wf) ? JSON.parse(fs.readFileSync(wf, "utf8")) : null;
  const tokens = s.sentences.map((x) => x.en).join(" ").split(/\s+/);
  const cues = [];
  if (words && words.length === tokens.length) {
    // English: lines of whole words, each word keeps its real start and end (for the highlight)
    let line = [], len = 0;
    const flush = () => {
      if (!line.length) return;
      cues.push({ lang: "en", start: LEAD + line[0].start, end: LEAD + line[line.length - 1].end, text: line.map((w) => w.t).join(" "), words: line.map((w) => ({ t: w.t, start: LEAD + w.start, end: LEAD + w.end })) });
      line = []; len = 0;
    };
    tokens.forEach((t, i) => {
      if (len + t.length + 1 > 62 && line.length) flush();
      line.push({ t, start: words[i].start, end: words[i].end });
      len += t.length + 1;
      if (/[.!?]$/.test(t)) flush();
      else if (/[,;:]$/.test(t) && len > 34) flush();
    });
    flush();
    // keep each line on screen until the next one starts
    cues.forEach((c, i) => { if (cues[i + 1]) c.end = Math.max(c.end, Math.min(cues[i + 1].start, c.end + 0.6)); else c.end += 0.4; });
    // Arabic: one block per sentence, timed from the spoken English sentence
    let k = 0;
    for (const sen of s.sentences) {
      const n = sen.en.split(/\s+/).length;
      const st = LEAD + words[k].start, en = LEAD + words[k + n - 1].end;
      k += n;
      const chunks = chunk(sen.ar, 56), tot = chunks.reduce((a2, c) => a2 + c.length, 0);
      let cur = st;
      for (const c of chunks) { const d = ((en - st) * c.length) / tot; cues.push({ lang: "ar", start: cur, end: cur + d, text: c }); cur += d; }
    }
  } else {
    const total = s.sentences.reduce((a2, x) => a2 + x.en.length, 0);
    let cursor = LEAD;
    for (const sen of s.sentences) {
      const sd = (sen.en.length / total) * ad;
      for (const lang of ["en", "ar"]) {
        const chunks = chunk(sen[lang], lang === "en" ? 64 : 56), tot = chunks.reduce((a2, c) => a2 + c.length, 0);
        let c1 = cursor;
        for (const c of chunks) { const d = (c.length / tot) * sd; cues.push({ lang, start: c1, end: c1 + d, text: c }); c1 += d; }
      }
      cursor += sd;
    }
  }
  const f = audioFile(s.id);
  out.push({ ...s, start: t, dur, audio: f ? path.basename(f) : null, audioDur: ad, cues });
  t += dur - 0.4; // scenes overlap by 0.4 s for the cross-dissolve
}
const total = t + 0.4;
fs.mkdirSync("src", { recursive: true });
const marks = {};
for (const f of fs.readdirSync("raw/screens")) if (f.endsWith(".marks.json")) marks[f.replace(".marks.json", "")] = JSON.parse(fs.readFileSync(`raw/screens/${f}`, "utf8"));
const aiUsed = fs.existsSync("raw/images") && fs.readdirSync("raw/images").some((f) => /\.(png|jpe?g)$/i.test(f));
fs.writeFileSync("src/data.json", JSON.stringify({ fps: FPS, total, aiUsed, have: fs.existsSync("raw/images") ? fs.readdirSync("raw/images") : [], marks, scenes: out }, null, 1));

// copy media for Remotion
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
for (const s of out) {
  if (s.audio) copy(`raw/audio/${s.audio}`, `public/audio/${s.audio}`);
  const vs = s.visual.type === "mix" ? s.visual.parts : [s.visual];
  for (const v of vs) {
    if (v.file && v.type !== "screen" && exists(`raw/images/${v.file}`)) copy(`raw/images/${v.file}`, `public/images/${v.file}`);
    if (v.clip && exists(`raw/clips/${v.clip}`)) copy(`raw/clips/${v.clip}`, `public/clips/${v.clip}`);
    if (v.type === "screen") { copy(`raw/screens/${v.src.file}.webm`, `public/screens/${v.src.file}.webm`); copy(`raw/screens/${v.src.file}.marks.json`, `public/screens/${v.src.file}.marks.json`); }
  }
}
copy("raw/audio/music.wav", "public/audio/music.wav");

// SRT
const ts = (x) => { const ms = Math.round(x * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
for (const lang of ["en", "ar"]) {
  let n = 1, srt = "";
  for (const s of out) for (const c of s.cues.filter((c) => c.lang === lang)) srt += `${n++}\n${ts(s.start + c.start)} --> ${ts(s.start + c.end)}\n${c.text}\n\n`;
  fs.mkdirSync("out", { recursive: true });
  fs.writeFileSync(`out/amoinee-${lang}.srt`, "﻿" + srt);
}

// storyboard
const mm = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
let sb = `# Amoinee explainer: storyboard\n\nTotal about ${mm(total)}. Generated from \`scenes.json\` by \`scripts/prepare.mjs\`.\n\n| Scene | Time | Visual | Prompt / source | On-screen text | Narration | Transition |\n|---|---|---|---|---|---|---|\n`;
for (const s of out) {
  const v = s.visual;
  const vis = v.type === "paper" ? "report picture" : v.type === "image" ? `AI image${v.clip ? " + Veo clip" : ""}` : v.type === "screen" ? `screen recording (${v.mockup})` : v.type === "mix" ? "AI image then screen recording" : v.type === "logo" ? "logo animation" : "AI image + logo end card";
  const src = v.type === "image" || v.type === "outro" ? `${v.file}: ${PROMPT[v.file] ?? ''}` : v.type === "screen" ? `${v.src.file}.webm ${v.src.from}-${v.src.to}s` : v.type === "mix" ? v.parts.map((p) => (p.type === "image" ? `${p.file}: ${PROMPT[p.file] ?? ''}` : p.type === "paper" ? `report picture ${p.file}` : `${p.src.file}.webm ${p.src.from}-${p.src.to}s`)).join(" / ") : "SVG logo draws on";
  sb += `| ${s.id} | ${mm(s.start)} | ${vis} | ${src.replace(/\|/g, "/")} | ${s.onScreen} | ${s.sentences.map((x) => x.en).join(" ").replace(/\|/g, "/")} | cross-dissolve |\n`;
}
fs.writeFileSync("storyboard.md", sb);

// Google Vids import pack
const pack = "google-vids-pack";
fs.mkdirSync(pack, { recursive: true });
let csv = "scene,start,end,visual file,narration,on-screen text\n";
const q = (x) => `"${String(x).replace(/"/g, '""')}"`;
out.forEach((s, i) => {
  const nn = String(i + 1).padStart(2, "0");
  if (s.audio) copy(`raw/audio/${s.audio}`, `${pack}/scene${nn}${path.extname(s.audio)}`);
  fs.writeFileSync(`${pack}/scene${nn}.txt`, s.sentences.map((x) => x.en).join(" ") + "\n\nعربي:\n" + s.sentences.map((x) => x.ar).join(" ") + "\n");
  const vs = s.visual.type === "mix" ? s.visual.parts : [s.visual];
  const files = [];
  for (const v of vs) {
    if (v.type === "screen") { const f = `${v.src.file}.webm`; copy(`raw/screens/${f}`, `${pack}/${f}`); files.push(f); }
    else if (v.file && exists(`raw/images/${v.file}`)) { copy(`raw/images/${v.file}`, `${pack}/${v.file}`); files.push(v.file); }
    else if (v.file) files.push(`${v.file} (not generated yet)`);
    if (v.clip && exists(`raw/clips/${v.clip}`)) { copy(`raw/clips/${v.clip}`, `${pack}/${v.clip}`); files.push(v.clip); }
  }
  csv += [nn, mm(s.start), mm(s.start + s.dur), files.join(" + ") || "logo (build in Vids)", s.sentences.map((x) => x.en).join(" "), s.onScreen].map(q).join(",") + "\n";
});
fs.writeFileSync(`${pack}/scenes.csv`, "﻿" + csv);
console.log("total", total.toFixed(1), "s =", mm(total));
