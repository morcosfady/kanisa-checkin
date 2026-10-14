"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { CalendarClock, QrCode, ScanFace, Smartphone, Volume2, VolumeX } from "lucide-react";
import { Logo } from "@/components/Logo";
import SacredBackground from "@/components/SacredBackground";
import { card } from "@/components/ui";
import { demoMembers } from "@/lib/demo";
import { loadHuman, setLiveness } from "@/lib/face/human";
import { usableFace } from "@/lib/face/quality";
import { fmtTime as fmtClock } from "@/lib/checkin";
import { supabaseBrowser } from "@/lib/supabase/client";

type Welcome = { id: number; name: string; time: string };
type Mode = "idle" | "scanning" | "match" | "unknown";
type Info = { open: boolean; name?: string; code?: string; token?: string };

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
  <motion.span aria-hidden animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.4, repeat: Infinity }} className={`absolute h-12 w-12 border-gold ${cls}`} />
);

export default function KioskScreen({ demo, liveness }: { demo: boolean; liveness: boolean }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [welcomes, setWelcomes] = useState<Welcome[]>([]);
  const [sound, setSound] = useState(true);
  const [cam, setCam] = useState<"loading" | "on" | "off">("loading");
  const [models, setModels] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [now, setNow] = useState<Date | null>(null);
  const [info, setInfo] = useState<Info | null>(demo ? { open: true, name: "Divine Liturgy", code: "482", token: "demo-token" } : null);
  const [infoError, setInfoError] = useState("");
  const [qr, setQr] = useState("");
  const [notice, setNotice] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const soundRef = useRef(true);
  const infoRef = useRef<Info | null>(info);
  const seen = useRef(new Map<string, number>());
  const nextId = useRef(1);
  const lastCall = useRef(0);

  useEffect(() => {
    soundRef.current = sound;
    infoRef.current = info;
  });

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // service name, 3-digit code and QR token (refreshed so the QR keeps changing)
  useEffect(() => {
    if (demo) return;
    let stopped = false;
    const load = async () => {
      const { data, error } = await supabaseBrowser().rpc("kiosk_info");
      if (stopped) return;
      if (error) return setInfoError(error.message);
      setInfoError("");
      setInfo(data as Info);
    };
    load();
    const id = setInterval(load, 10000);
    return () => { stopped = true; clearInterval(id); };
  }, [demo]);

  useEffect(() => {
    if (!info?.token) return;
    QRCode.toDataURL(`${window.location.origin}/c/${info.token}`, { margin: 1, width: 260, color: { dark: "#2a1a1c", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [info?.token]);

  const welcome = useCallback((names: string[]) => {
    const time = fmtClock(new Date().toISOString());
    const items = names.map((n) => ({ id: nextId.current++, name: n, time }));
    setMode("match");
    if (soundRef.current) chime();
    setWelcomes((w) => [...items, ...w].slice(0, 5));
    items.forEach((it) => setTimeout(() => setWelcomes((w) => w.filter((x) => x.id !== it.id)), 3200));
    setTimeout(() => setMode("idle"), 3300);
  }, []);

  // camera + face loop (real mode)
  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } }, audio: false });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        video.current!.srcObject = stream;
        await video.current!.play();
        setCam("on");
      } catch {
        setCam("off");
        return;
      }
      if (demo) return;

      try {
        setModels("loading");
        const human = await loadHuman();
        setLiveness(human, liveness);
        setModels("ready");
        const db = supabaseBrowser();

        const tick = async () => {
          if (stopped) return;
          const v = video.current!;
          if (document.hidden || !infoRef.current?.open) {
            timer = setTimeout(tick, 800);
            return;
          }
          const res = await human.detect(v);
          if (stopped) return;
          setNotice("");
          const names: string[] = [];
          // one person at a time: use the biggest face; if two people are close together, ask them to take turns
          const area = (f: (typeof res.face)[number]) => (f.box?.[2] ?? 0) * (f.box?.[3] ?? 0);
          const faces = [...res.face].sort((a, b) => area(b) - area(a));
          const together = faces.length > 1 && area(faces[1]) > area(faces[0]) * 0.45;
          if (together) setNotice("One person at a time, please.");
          for (const f of together ? [] : faces.slice(0, 1)) {
            const u = usableFace(f as never, v.videoWidth, { liveness });
            if (!u.ok) {
              if (u.reason === "liveness") setNotice("Please look straight at the camera.");
              continue;
            }
            if (Date.now() < lastCall.current) continue;
            lastCall.current = Date.now() + 500;
            const { data, error } = await db.rpc("kiosk_face_check_in", { p_embedding: Array.from(f.embedding!) });
            if (error || !data) continue;
            if (data.ok && !data.already) names.push(data.first_name);
            else if (data.ok && data.already) {
              const last = seen.current.get(data.first_name) ?? 0;
              if (Date.now() - last > 20000) {
                seen.current.set(data.first_name, Date.now());
                setNotice(`${data.first_name}, you are already checked in 🙏`);
              }
            } else if (data.error === "no_match" || data.error === "ambiguous") {
              lastCall.current = Date.now() + 2500;
              setMode("unknown");
              setTimeout(() => setMode((m) => (m === "unknown" ? "idle" : m)), 7000);
            }
          }
          if (names.length) welcome(names);
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch {
        setModels("error");
      }
    })();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [demo, liveness, welcome]);

  const clockText = now ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }) : "";

  const simulate = (kind: "one" | "unknown") => {
    setMode("scanning");
    setTimeout(() => {
      if (kind === "unknown") return setMode("unknown");
      const pool = demoMembers.filter((m) => m.face === "enrolled").map((m) => m.name.split(" ")[0]);
      welcome([...pool].sort(() => Math.random() - 0.5).slice(0, 1));
    }, 1300);
  };

  const ok = mode === "match";
  const frame = ok ? "border-[#2f7a4f] shadow-[0_0_0_6px_rgb(47_122_79/0.25)]" : "border-gold/70";
  const open = info?.open;

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-5 px-4 pb-8">
      <SacredBackground light />

      <header className="-mx-4 flex w-[calc(100%+2rem)] flex-wrap items-center justify-center gap-x-8 gap-y-2 border-b border-gold/30 bg-coptic px-6 py-3 text-cream">
        <Logo size={44} />
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-gold-light">{open ? "Now serving" : "Check-in"}</div>
          <div className="font-display text-xl font-semibold">{open ? info?.name : "Not open"}</div>
        </div>
        <div className="font-display text-2xl font-semibold num">{clockText}</div>
        <button onClick={() => setSound(!sound)} aria-label={sound ? "Mute chime" : "Unmute chime"} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
          {sound ? <Volume2 size={20} strokeWidth={1.75} /> : <VolumeX size={20} strokeWidth={1.75} />}
        </button>
      </header>

      {infoError && <p role="alert" className="rounded-[12px] bg-danger-tint px-4 py-2 text-danger">{infoError}</p>}

      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="flex flex-col items-center gap-4">
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
                  <p className="mt-2 text-sm">{cam === "loading" ? "Starting camera…" : demo ? "Camera preview off (demo mode)" : "Camera is off. Allow camera access for face check-in."}</p>
                </div>
              </div>
            )}
            <Bracket cls="start-4 top-4 rounded-ss-xl border-s-4 border-t-4" />
            <Bracket cls="end-4 top-4 rounded-se-xl border-e-4 border-t-4" />
            <Bracket cls="bottom-4 start-4 rounded-es-xl border-b-4 border-s-4" />
            <Bracket cls="bottom-4 end-4 rounded-ee-xl border-b-4 border-e-4" />
            {(mode === "idle" || mode === "scanning") && open !== false && (
              <span aria-hidden className="scanline absolute inset-x-8 h-0.5 rounded bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_14px_3px_rgb(201_162_74/0.7)]" />
            )}
            {!demo && models === "loading" && <p className="absolute inset-x-0 bottom-3 text-center text-sm text-cream/80">Loading face recognition…</p>}
            {!demo && models === "error" && <p className="absolute inset-x-0 bottom-3 text-center text-sm text-cream/80">Face recognition could not start. Use the QR code or the code.</p>}
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
            {notice && <p className="text-center text-lg text-muted">{notice}</p>}
            <AnimatePresence>
              {welcomes.map((w) => (
                <motion.div key={w.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-between rounded-[24px] bg-[#26663f] px-6 py-5 text-white shadow-lift">
                  <span className="font-display text-2xl font-semibold sm:text-3xl">Welcome, {w.name} 🙏</span>
                  <span className="num text-xl">{w.time}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {mode === "unknown" && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className={`${card} p-5 text-center`}>
                <p className="font-display text-xl font-semibold text-heading">We couldn’t recognize you</p>
                <p className="mt-1 text-lg text-muted">Please scan the QR code or type the code on your phone.</p>
              </motion.div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          {open === false ? (
            <div className={`${card} space-y-2 p-6 text-center`}>
              <CalendarClock size={36} strokeWidth={1.5} className="mx-auto text-goldtext" />
              <p className="font-display text-xl font-semibold text-heading">No service is open right now</p>
              <p className="text-muted">Check-in opens automatically at the scheduled time.</p>
            </div>
          ) : (
            <>
              <div className={`${card} space-y-3 p-5 text-center`}>
                <h2 className="flex items-center justify-center gap-2 font-display text-lg font-semibold text-heading"><QrCode size={20} strokeWidth={1.75} /> Scan with your phone</h2>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qr ? <img src={qr} alt="QR code to check in" width={220} height={220} className="mx-auto rounded-[12px] border border-line" /> : <div className="skeleton mx-auto h-[220px] w-[220px]" />}
                <p className="text-sm text-muted">Point your phone camera here. This code changes every minute.</p>
              </div>
              <div className={`${card} space-y-2 p-5 text-center`}>
                <h2 className="flex items-center justify-center gap-2 font-display text-lg font-semibold text-heading"><Smartphone size={20} strokeWidth={1.75} /> Or type today’s code</h2>
                <div aria-label={`Code ${info?.code ?? ""}`} className="font-display text-6xl font-semibold tracking-[0.25em] text-heading num ps-[0.25em]">{info?.code ?? "···"}</div>
                <p className="text-sm text-muted">Open Amoinee on your phone, tap Check in, and enter this code.</p>
              </div>
            </>
          )}
        </aside>
      </div>

      {demo && (
        <div className="mt-auto flex flex-wrap items-center justify-center gap-2 pt-2 text-sm text-muted">
          <span className="rounded-full bg-gold/20 px-3 py-1 font-semibold text-goldtext">Demo mode</span>
          <button onClick={() => simulate("one")} className="rounded-[12px] border border-line bg-card px-3 py-1.5 hover:bg-hover">Simulate a face</button>
          <button onClick={() => simulate("unknown")} className="rounded-[12px] border border-line bg-card px-3 py-1.5 hover:bg-hover">Simulate unknown</button>
        </div>
      )}
    </div>
  );
}
