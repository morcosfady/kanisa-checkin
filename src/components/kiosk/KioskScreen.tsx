"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QrCode, ScanFace, Search, UserPlus, Volume2, VolumeX } from "lucide-react";
import { Logo } from "@/components/Logo";
import SacredBackground from "@/components/SacredBackground";
import { demoMembers, demoService, fmtTime } from "@/lib/demo";

type Welcome = { id: number; name: string; time: string };
type Mode = "idle" | "scanning" | "match" | "unknown" | "search";

// soft two-note chime (no audio file needed)
function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.16 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.7);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.16);
      o.stop(ctx.currentTime + i * 0.16 + 0.75);
    });
  } catch {}
}

const Bracket = ({ cls }: { cls: string }) => (
  <motion.span
    aria-hidden
    animate={{ opacity: [0.7, 1, 0.7] }}
    transition={{ duration: 2.4, repeat: Infinity }}
    className={`absolute h-12 w-12 border-gold ${cls}`}
  />
);

export default function KioskScreen() {
  const [mode, setMode] = useState<Mode>("idle");
  const [welcomes, setWelcomes] = useState<Welcome[]>([]);
  const [sound, setSound] = useState(true);
  const [cam, setCam] = useState<"loading" | "on" | "off">("loading");
  const [now, setNow] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const seen = useRef(new Set<string>());
  const nextId = useRef(1);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) video.current.srcObject = s;
        setCam("on");
      })
      .catch(() => setCam("off"));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const clockText = now ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

  const welcome = useCallback((names: string[]) => {
    const fresh = names.filter((n) => !seen.current.has(n));
    names.forEach((n) => seen.current.add(n));
    const time = fmtTime(new Date().getHours() * 60 + new Date().getMinutes());
    const items = (fresh.length ? fresh : names).map((n) => ({ id: nextId.current++, name: n.split(" ")[0], time }));
    setMode("match");
    if (sound) chime();
    setWelcomes((w) => [...items, ...w].slice(0, 5));
    items.forEach((it) => setTimeout(() => setWelcomes((w) => w.filter((x) => x.id !== it.id)), 3000));
    setTimeout(() => setMode("idle"), 3200);
  }, [sound]);

  const pick = (n: number) => {
    const pool = demoMembers.filter((m) => m.face === "enrolled").map((m) => m.name);
    return [...pool].sort(() => Math.random() - 0.5).slice(0, n);
  };

  const simulate = (kind: "one" | "family" | "unknown") => {
    setMode("scanning");
    setTimeout(() => (kind === "unknown" ? setMode("unknown") : welcome(pick(kind === "one" ? 1 : 3))), 1300);
  };

  const matches = query.trim().length >= 2
    ? demoMembers.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 3)
    : [];

  const ok = mode === "match";
  const frame = ok ? "border-[#2f7a4f] shadow-[0_0_0_6px_rgb(47_122_79/0.25)]" : "border-gold/70";

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-5 px-4 pb-8">
      <SacredBackground light />

      <header className="-mx-4 flex w-[calc(100%+2rem)] flex-wrap items-center justify-center gap-x-8 gap-y-2 border-b border-gold/30 bg-coptic px-6 py-3 text-cream">
        <Logo size={44} />
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-gold-light">Now serving</div>
          <div className="font-display text-xl font-semibold">{demoService.nameEn}</div>
        </div>
        <div className="font-display text-2xl font-semibold num">{clockText}</div>
        <button onClick={() => setSound(!sound)} aria-label={sound ? "Mute chime" : "Unmute chime"} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
          {sound ? <Volume2 size={20} strokeWidth={1.75} /> : <VolumeX size={20} strokeWidth={1.75} />}
        </button>
      </header>

      <div className="text-center">
        <p className="font-display text-2xl font-semibold text-heading sm:text-3xl">Please look at the camera 🙏</p>
        <p className="mt-1 text-lg text-muted" dir="rtl" lang="ar">من فضلك انظر إلى الكاميرا</p>
      </div>

      <div className={`relative aspect-[4/3] w-full max-w-xl overflow-hidden rounded-[24px] border-4 bg-[#1a0f11] transition-all duration-300 ${frame}`}>
        <video ref={video} autoPlay playsInline muted className={`h-full w-full -scale-x-100 object-cover ${cam === "on" ? "" : "hidden"}`} />
        {cam !== "on" && (
          <div className="grid h-full w-full place-items-center bg-gradient-to-b from-[#3a1a20] to-[#1a0f11] text-cream/70">
            <div className="text-center">
              <ScanFace size={72} strokeWidth={1.25} className="mx-auto text-gold" />
              <p className="mt-2 text-sm">{cam === "loading" ? "Starting camera…" : "Camera preview off (demo mode)"}</p>
            </div>
          </div>
        )}

        {/* gold corner brackets */}
        <Bracket cls="start-4 top-4 rounded-ss-xl border-s-4 border-t-4" />
        <Bracket cls="end-4 top-4 rounded-se-xl border-e-4 border-t-4" />
        <Bracket cls="bottom-4 start-4 rounded-es-xl border-b-4 border-s-4" />
        <Bracket cls="bottom-4 end-4 rounded-ee-xl border-b-4 border-e-4" />

        {(mode === "idle" || mode === "scanning") && (
          <span aria-hidden className="scanline absolute inset-x-8 h-0.5 rounded bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_14px_3px_rgb(201_162_74/0.7)]" />
        )}

        <AnimatePresence>
          {ok && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-[#2f7a4f]/25">
              <svg width="110" height="110" viewBox="0 0 110 110" aria-hidden>
                <circle cx="55" cy="55" r="48" fill="rgb(47 122 79 / 0.9)" />
                <motion.path d="M32 57l16 16 31-34" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.1 }} />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-xl space-y-3" role="status" aria-live="polite">
        <AnimatePresence>
          {welcomes.map((w) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between rounded-[24px] bg-[#26663f] px-6 py-5 text-white shadow-lift"
            >
              <span className="font-display text-2xl font-semibold sm:text-3xl">Welcome, {w.name} 🙏</span>
              <span className="num text-xl">{w.time}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {mode === "unknown" && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-line bg-card p-5 text-center shadow-lift">
            <p className="font-display text-xl font-semibold text-heading">We couldn’t recognize you</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Search my name", icon: Search, go: () => setMode("search") },
                { label: "Scan QR", icon: QrCode, go: () => setMode("idle") },
                { label: "I’m new", icon: UserPlus, go: () => setMode("idle") },
              ].map(({ label, icon: Icon, go }) => (
                <button key={label} onClick={go} className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-[16px] bg-coptic px-4 py-4 text-lg font-semibold text-white transition active:scale-[0.98] hover:bg-coptic-dark">
                  <Icon size={26} strokeWidth={1.75} />{label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {mode === "search" && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-line bg-card p-5 shadow-lift">
            <label className="block text-lg font-semibold text-heading">
              Type your name
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} className="mt-2 w-full rounded-[12px] border border-line bg-page px-4 py-3 text-xl outline-none focus:border-gold" />
            </label>
            <ul className="mt-3 space-y-2">
              {matches.map((m) => (
                <li key={m.id}>
                  <button onClick={() => { setQuery(""); welcome([m.name]); }} className="w-full rounded-[12px] bg-page px-4 py-3 text-start text-xl font-medium hover:bg-hover">
                    {m.name.split(" ")[0]}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-center gap-2 pt-2 text-sm text-muted">
        <span className="rounded-full bg-gold/20 px-3 py-1 font-semibold text-goldtext">Demo mode</span>
        <button onClick={() => simulate("one")} className="rounded-[12px] border border-line bg-card px-3 py-1.5 hover:bg-hover">Simulate a face</button>
        <button onClick={() => simulate("family")} className="rounded-[12px] border border-line bg-card px-3 py-1.5 hover:bg-hover">Simulate a family</button>
        <button onClick={() => simulate("unknown")} className="rounded-[12px] border border-line bg-card px-3 py-1.5 hover:bg-hover">Simulate unknown</button>
      </div>
    </div>
  );
}
