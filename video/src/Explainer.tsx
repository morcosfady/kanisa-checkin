import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import data from "./data.json";
import { C, FONT } from "./theme";
import { LogoAnim, Mark } from "./Logo";
import { Backdrop, Device, LowerThird, Particles, Photo, Subtitle } from "./Visuals";

type Scene = (typeof data.scenes)[number];
const FPS = data.fps;
const have = new Set(data.have as string[]);
const LAYOUT = {
  land: { laptop: { x: 140, y: 40, w: 1640, h: 880 }, tablet: { x: 300, y: 30, w: 1320, h: 860 }, phone: { x: 120, y: 20, w: 760, h: 960 } },
  vert: { laptop: { x: 10, y: 380, w: 1060, h: 880 }, tablet: { x: 10, y: 380, w: 1060, h: 900 }, phone: { x: 120, y: 150, w: 840, h: 1250 } },
};

const Visual: React.FC<{ s: Scene; vertical: boolean }> = ({ s, vertical }) => {
  const f = useCurrentFrame();
  const v = s.visual as any;
  const lay = vertical ? LAYOUT.vert : LAYOUT.land;
  const dur = s.dur;
  const screen = (part: any, d: number) => (
    <>
      <Backdrop vertical={vertical} />
      <Device mock={part.mockup} src={part.src} dur={d} box={(lay as any)[part.mockup]} />
      {part.mockup === "phone" && !vertical && (
        <div style={{ position: "absolute", left: 1000, top: 300, width: 800, fontFamily: FONT.title, fontSize: 64, color: C.cream, lineHeight: 1.2 }}>
          <div style={{ color: "#e6cf8f", fontSize: 28, fontFamily: FONT.body, letterSpacing: 6, marginBottom: 14 }}>FOR EVERYONE WHO COMES</div>
          {s.onScreen}
          <div style={{ fontFamily: FONT.body, fontSize: 30, color: "#d9c9b0", marginTop: 26, lineHeight: 1.5 }}>Name and contact details · Face check-in only if you want it</div>
        </div>
      )}
    </>
  );
  if (v.type === "image") return <Photo file={v.file} dur={dur} label={v.prompt} hasFile={have.has(v.file)} vertical={vertical} />;
  if (v.type === "logo") {
    const come = interpolate(f, [2.6 * FPS, 3.4 * FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <>
        <Backdrop vertical={vertical} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: vertical ? 200 : 60 }}>
          <LogoAnim size={vertical ? 300 : 280} delay={0.3} />
          <div style={{ marginTop: 48, fontFamily: FONT.title, fontSize: vertical ? 64 : 58, color: C.cream, opacity: come, letterSpacing: 4 }}>Come!</div>
        </AbsoluteFill>
      </>
    );
  }
  if (v.type === "screen") return screen(v, dur);
  if (v.type === "mix") {
    const [a, b] = v.parts;
    const cut = Math.round(a.weight * dur * FPS);
    return (
      <>
        <Sequence from={0} durationInFrames={cut + 10}><Photo file={a.file} dur={a.weight * dur} label={a.prompt} hasFile={have.has(a.file)} vertical={vertical} /></Sequence>
        <Sequence from={cut} durationInFrames={Math.round(dur * FPS) - cut}>
          <AbsoluteFill>{screen(b, b.weight * dur)}</AbsoluteFill>
        </Sequence>
      </>
    );
  }
  // outro: the picture, then the closing card
  const endAt = (dur - 5.2) * FPS;
  const card = interpolate(f, [endAt, endAt + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Photo file={v.file} dur={dur} label={v.prompt} hasFile={have.has(v.file)} vertical={vertical} />
      <AbsoluteFill style={{ opacity: card, background: `linear-gradient(160deg, ${C.burgundy}, ${C.dark})`, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}>
        <Particles n={20} seed="end" />
        <LogoAnim size={vertical ? 240 : 200} delay={(endAt + 6) / FPS} />
        <div style={{ fontFamily: FONT.title, fontSize: vertical ? 50 : 46, color: C.cream, textAlign: "center", maxWidth: 1300, lineHeight: 1.25, padding: "0 60px" }}>Every one of God&apos;s people, known and cared for.</div>
        <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 34, color: C.gold, letterSpacing: 2 }}>kanisa-checkin.vercel.app</div>
        {data.aiUsed && <div style={{ position: "absolute", bottom: 40, fontFamily: FONT.body, fontSize: 22, color: "#bfae92" }}>Images and some clips generated with AI</div>}
      </AbsoluteFill>
    </>
  );
};

const SceneView: React.FC<{ s: Scene; vertical: boolean; first: boolean }> = ({ s, vertical, first }) => {
  const f = useCurrentFrame();
  const n = Math.round(s.dur * FPS);
  const opacity = interpolate(f, [0, first ? 1 : 12, n - 12, n], [first ? 1 : 0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vt = (s.visual as any).type;
  const isMock = vt === "screen" || vt === "mix";
  return (
    <AbsoluteFill style={{ opacity }}>
      <Visual s={s} vertical={vertical} />
      {vt !== "logo" && (s.visual as any).mockup !== "phone" && <LowerThird text={s.onScreen} vertical={vertical} top={isMock && !vertical && (s.visual as any).mockup !== "phone"} />}
      <Subtitle cues={s.cues as any} vertical={vertical} />
    </AbsoluteFill>
  );
};

// the music dips under the voice
function musicVolume(frame: number, scenes: Scene[], starts: number[], total: number) {
  let duck = 0;
  scenes.forEach((s, i) => {
    const a = (starts[i] + 0.5) * FPS, b = a + s.audioDur * FPS;
    duck = Math.max(duck, interpolate(frame, [a - 8, a + 6, b - 6, b + 12], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  });
  const fade = interpolate(frame, [total * FPS - 90, total * FPS], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (0.3 - duck * 0.2) * fade; // 0.30 alone, 0.10 under the voice
}

export const Cut: React.FC<{ ids?: string[]; vertical?: boolean }> = ({ ids, vertical = false }) => {
  const list = (ids ? ids.map((id) => data.scenes.find((s) => s.id === id)!) : data.scenes) as Scene[];
  const starts: number[] = [];
  let t = 0;
  list.forEach((s) => { starts.push(t); t += s.dur - 0.4; });
  const total = t + 0.4;
  return (
    <AbsoluteFill style={{ background: C.deep }}>
      {list.map((s, i) => (
        <Sequence key={s.id} from={Math.round(starts[i] * FPS)} durationInFrames={Math.round(s.dur * FPS)}>
          <SceneView s={s} vertical={vertical} first={i === 0} />
          {s.audio && <Sequence from={Math.round(0.5 * FPS)}><Audio src={staticFile(`audio/${s.audio}`)} volume={1} /></Sequence>}
        </Sequence>
      ))}
      <Audio src={staticFile("audio/music.wav")} volume={(f) => musicVolume(f, list, starts, total)} />
    </AbsoluteFill>
  );
};

export const cutFrames = (ids?: string[]) => {
  const list = ids ? ids.map((id) => data.scenes.find((s) => s.id === id)!) : data.scenes;
  return Math.ceil((list.reduce((a, s) => a + s.dur - 0.4, 0) + 0.4) * FPS);
};

export const Thumb: React.FC = () => (
  <AbsoluteFill style={{ background: `linear-gradient(135deg, ${C.burgundy}, ${C.dark})` }}>
    <Particles n={24} seed="th" />
    <div style={{ position: "absolute", left: 70, top: 90 }}><Mark size={120} /></div>
    <div style={{ position: "absolute", left: 70, top: 260, fontFamily: FONT.title, fontSize: 96, lineHeight: 1.05, color: C.cream, width: 640 }}>Know every soul</div>
    <div style={{ position: "absolute", left: 70, top: 480, fontFamily: FONT.coptic, fontSize: 56, color: "#e6cf8f", letterSpacing: 8 }}>ⲁⲙⲱⲓⲛⲓ</div>
    <div style={{ position: "absolute", left: 70, top: 570, fontFamily: FONT.body, fontWeight: 600, fontSize: 34, color: C.gold }}>AMOINEE · church attendance, with care</div>
    <div style={{ position: "absolute", right: 50, top: 100, width: 600, borderRadius: 26, overflow: "hidden", border: `5px solid ${C.gold}`, boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}>
      <img src={staticFile("frames/kiosk-welcome.png")} style={{ width: "100%", display: "block" }} />
    </div>
  </AbsoluteFill>
);
