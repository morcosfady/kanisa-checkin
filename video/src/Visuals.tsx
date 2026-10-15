import React from "react";
import { AbsoluteFill, Img, interpolate, OffthreadVideo, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "./theme";
import data from "./data.json";

type Mock = "laptop" | "tablet" | "phone";
type Src = { file: string; from: number; to: number };

const SCREEN = { laptop: { w: 1440, h: 900 }, tablet: { w: 1194, h: 834 }, phone: { w: 430, h: 900 } } as const;

// soft gold light particles drifting up
export const Particles: React.FC<{ n?: number; seed?: string }> = ({ n = 26, seed = "p" }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: n }, (_, i) => {
        const x = random(`${seed}x${i}`) * width, s = 3 + random(`${seed}s${i}`) * 7, sp = 0.25 + random(`${seed}v${i}`) * 0.6, o = 0.15 + random(`${seed}o${i}`) * 0.4;
        const y = (height + 60 - ((f * sp * 1.5 + random(`${seed}y${i}`) * height) % (height + 120)));
        return <div key={i} style={{ position: "absolute", left: x + Math.sin(f / 40 + i) * 14, top: y, width: s, height: s, borderRadius: "50%", background: C.gold, opacity: o, filter: "blur(1px)", boxShadow: `0 0 ${s * 3}px ${C.gold}` }} />;
      })}
    </AbsoluteFill>
  );
};

export const Backdrop: React.FC<{ vertical?: boolean }> = ({ vertical }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, #5a1520 0%, ${C.burgundy}33 35%, transparent 70%), linear-gradient(160deg, #3a1018 0%, ${C.dark} 100%)` }}>
    <Particles n={vertical ? 18 : 26} />
  </AbsoluteFill>
);

// A picture (AI generated) with a slow Ken Burns move. If the file is not there yet, a clear placeholder shows instead.
export const Photo: React.FC<{ file: string; dur: number; label: string; hasFile: boolean; vertical?: boolean }> = ({ file, dur, label, hasFile, vertical }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, f / (dur * fps));
  const scale = 1.03 + p * 0.08;
  const dx = (random(file) - 0.5) * 40 * p;
  if (!hasFile) {
    // no picture yet: an elegant title card instead of an empty frame
    return (
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 60% 30%, #6a2430 0%, ${C.dark} 70%)`, alignItems: "center", justifyContent: "center", transform: `scale(${scale})` }}>
        <Particles n={22} seed={file} />
        <div style={{ textAlign: "center", color: C.cream, maxWidth: vertical ? 900 : 1300, padding: 40 }}>
          <div style={{ width: 90, height: 3, background: C.gold, margin: "0 auto 36px", borderRadius: 2 }} />
          <div style={{ fontFamily: FONT.title, fontSize: vertical ? 78 : 84, lineHeight: 1.12 }}>{label}</div>
        </div>
        <div style={{ position: "absolute", right: 24, bottom: 18, fontFamily: FONT.body, fontSize: 18, color: "rgba(255,255,255,.28)" }}>{file}</div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={staticFile(`images/${file}`)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translateX(${dx}px)` }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(26,6,10,.55) 100%)" }} />
      <Particles n={14} seed={file} />
    </AbsoluteFill>
  );
};

type Mark = { t: number; label: string; x: number; y: number; w: number; h: number };

// A device frame with the screen recording inside, plus gold rings and labels where the story is
export const Device: React.FC<{ mock: Mock; src: Src; dur: number; box: { x: number; y: number; w: number; h: number } }> = ({ mock, src, dur, box }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sc = SCREEN[mock];
  const rate = Math.min(2.5, Math.max(0.5, (src.to - src.from) / dur));
  const bezel = mock === "phone" ? 16 : mock === "tablet" ? 22 : 12;
  const scale = Math.min(box.w / (sc.w + bezel * 2), box.h / (sc.h + bezel * 2 + (mock === "laptop" ? 26 : 0)));
  const sw = sc.w * scale, sh = sc.h * scale, bz = bezel * scale;
  const left = box.x + (box.w - sw - bz * 2) / 2, top = box.y + (box.h - sh - bz * 2 - (mock === "laptop" ? 26 * scale : 0)) / 2;
  const enter = interpolate(f, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const marks: Mark[] = ((data.marks as Record<string, { marks: Mark[] }>)[src.file]?.marks ?? []).filter((m) => m.t >= src.from + 0.3 && m.t <= src.to);
  const nowSrc = src.from + (f / fps) * rate;
  return (
    <div style={{ position: "absolute", left, top: top + (1 - enter) * 30, opacity: enter }}>
      <div style={{ width: sw + bz * 2, height: sh + bz * 2, borderRadius: (mock === "phone" ? 44 : 20) * scale + 8, background: "#0d0608", border: "2px solid #3b2a2d", boxShadow: "0 40px 90px rgba(0,0,0,.55), 0 0 0 1px rgba(201,162,74,.25)", padding: bz, boxSizing: "border-box", position: "relative" }}>
        <div style={{ width: sw, height: sh, borderRadius: (mock === "phone" ? 34 : 8) * scale + 2, overflow: "hidden", position: "relative", background: "#000" }}>
          <OffthreadVideo src={staticFile(`screens/${src.file}.webm`)} startFrom={Math.round(src.from * fps)} playbackRate={rate} muted style={{ width: sw, height: sh, objectFit: "cover" }} />
          {marks.map((m, i) => {
            const k = (nowSrc - m.t) / rate; // seconds since the moment (scene time)
            const vis = interpolate(k, [-0.3, 0.2, 2.6, 3.1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            if (vis <= 0) return null;
            const pad = 8;
            return (
              <div key={i} style={{ position: "absolute", left: m.x * sw - pad, top: m.y * sh - pad, width: m.w * sw + pad * 2, height: m.h * sh + pad * 2, opacity: vis, borderRadius: 14, border: `3px solid ${C.gold}`, boxShadow: `0 0 28px 6px rgba(201,162,74,.55), inset 0 0 18px rgba(201,162,74,.25)`, transform: `scale(${1 + (1 - vis) * 0.06})` }}>
                <div style={{ position: "absolute", left: 0, bottom: "100%", marginBottom: 10, whiteSpace: "nowrap", background: C.gold, color: "#2a0b10", fontFamily: FONT.body, fontWeight: 600, fontSize: Math.max(22, 30 * scale), padding: "6px 16px", borderRadius: 999, boxShadow: "0 6px 20px rgba(0,0,0,.4)", transform: `translateY(${(1 - vis) * 8}px)` }}>{m.label}</div>
              </div>
            );
          })}
        </div>
        {mock === "phone" && <div style={{ position: "absolute", top: bz * 0.35, left: "50%", width: sw * 0.25, height: bz * 0.3, borderRadius: 8, background: "#1c1214", transform: "translateX(-50%)" }} />}
      </div>
      {mock === "laptop" && <div style={{ width: sw + bz * 2 + 120 * scale, height: 26 * scale, marginLeft: -60 * scale, borderRadius: `0 0 ${40 * scale}px ${40 * scale}px`, background: "linear-gradient(#cfc7bb, #8d857a)", boxShadow: "0 20px 40px rgba(0,0,0,.5)" }} />}
      {mock === "tablet" && <div style={{ width: 16 * scale + 10, height: 120 * scale, margin: "0 auto", background: "linear-gradient(90deg,#2a1a1d,#4a3438,#2a1a1d)" }} />}
    </div>
  );
};

// A printed page on a dark table (the one-page report)
export const Paper: React.FC<{ file: string; vertical?: boolean }> = ({ file, vertical }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = interpolate(f, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const h = vertical ? 1100 : 940;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: vertical ? 300 : 40 }}>
      <Img src={staticFile(`images/${file}`)} style={{ height: h, background: "#fff", borderRadius: 6, boxShadow: "0 40px 90px rgba(0,0,0,.6)", transform: `translateY(${(1 - enter) * 40}px) rotate(${-1.2 + (f / fps) * 0.08}deg) scale(${1 + (f / fps) * 0.004})`, opacity: enter }} />
    </AbsoluteFill>
  );
};

export const LowerThird: React.FC<{ text: string; vertical?: boolean; top?: boolean }> = ({ text, vertical, top }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = interpolate(f, [0.5 * fps, 0.9 * fps, 4.4 * fps, 4.9 * fps], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", left: vertical ? 60 : 110, top: top ? (vertical ? 120 : 70) : undefined, bottom: top ? undefined : vertical ? 420 : 190, opacity: a, transform: `translateX(${(1 - a) * -30}px)`, display: "flex", alignItems: "stretch", gap: 18 }}>
      <div style={{ width: 6, background: C.gold, borderRadius: 3 }} />
      <div style={{ fontFamily: FONT.title, fontSize: vertical ? 52 : 50, color: C.cream, textShadow: "0 3px 18px rgba(0,0,0,.7)", maxWidth: vertical ? 900 : 1100, lineHeight: 1.15 }}>{text}</div>
    </div>
  );
};

type Cue = { lang: string; start: number; end: number; text: string; words?: { t: string; start: number; end: number }[] };

// English subtitles; the word being spoken lights up in gold
export const Subtitle: React.FC<{ cues: Cue[]; vertical?: boolean }> = ({ cues, vertical }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const c = cues.find((x) => x.lang === "en" && t >= x.start && t < x.end);
  if (!c) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: vertical ? 220 : 56, display: "flex", justifyContent: "center", padding: "0 80px" }}>
      <div style={{ background: "rgba(14,4,7,.78)", fontFamily: FONT.body, fontWeight: 600, fontSize: vertical ? 46 : 40, lineHeight: 1.3, padding: "10px 28px", borderRadius: 14, textAlign: "center", maxWidth: vertical ? 960 : 1500, boxShadow: "0 8px 30px rgba(0,0,0,.35)" }}>
        {c.words
          ? c.words.map((w, i) => {
              const now = t >= w.start && t < w.end + 0.06;
              const done = t >= w.end;
              return (
                <span key={i} style={{ color: now ? "#2a0b10" : done ? "#ffffff" : "rgba(255,255,255,.55)", background: now ? C.gold : "transparent", borderRadius: 8, padding: "0 7px", margin: "0 -1px", boxShadow: now ? "0 0 18px rgba(201,162,74,.65)" : "none", display: "inline-block", transition: "none" }}>{w.t}</span>
              );
            })
          : <span style={{ color: "#fff" }}>{c.text}</span>}
      </div>
    </div>
  );
};
