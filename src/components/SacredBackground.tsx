"use client";
import { useEffect, useRef } from "react";

// Soft gradient + drifting cross lattice + candle-light particles + slow haze.
// Static when the user prefers reduced motion; pauses when the tab is hidden.
const TILE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%23c9a24a' stroke-width='1.2'%3E%3Cpath d='M40 28v24M28 40h24'/%3E%3Ccircle cx='40' cy='26' r='2.4'/%3E%3Ccircle cx='40' cy='54' r='2.4'/%3E%3Ccircle cx='26' cy='40' r='2.4'/%3E%3Ccircle cx='54' cy='40' r='2.4'/%3E%3Cpath d='M0 0l8 8M80 0l-8 8M0 80l8-8M80 80l-8-8'/%3E%3C/g%3E%3C/svg%3E\")";

type P = { x: number; y: number; r: number; v: number; a: number; phase: number };

export default function SacredBackground({ light = false }: { light?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const count = light ? 14 : 28;
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const make = (fresh: boolean): P => ({
      x: Math.random() * w,
      y: fresh ? Math.random() * h : h + 10,
      r: 1 + Math.random() * 2.6,
      v: 6 + Math.random() * 14, // px per second
      a: 0.25 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
    });
    const parts = Array.from({ length: count }, () => make(true));

    let raf = 0;
    let last = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 33) return; // cap at ~30fps
      const dt = last ? (t - last) / 1000 : 0.033;
      last = t;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.y -= p.v * dt;
        p.x += Math.sin(t / 2500 + p.phase) * 0.15;
        const life = Math.max(0, Math.min(1, p.y / h)); // fades as it rises
        ctx.globalAlpha = p.a * Math.min(1, life * 1.6) * (0.65 + 0.35 * Math.sin(t / 900 + p.phase));
        ctx.fillStyle = "#e3c26f";
        ctx.shadowColor = "#c9a24a";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        if (p.y < -10) parts[i] = make(false);
      }
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    start();
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", resize);
    };
  }, [light]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-page">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgb(201 162 74 / 0.18), transparent 70%)" }}
      />
      <div
        className="sacred-pattern absolute inset-0"
        style={{ backgroundImage: TILE, opacity: "var(--pattern-opacity)" }}
      />
      {!light && (
        <>
          <div className="haze-a absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-[#7a1f2b] opacity-[0.08] blur-3xl" />
          <div className="haze-b absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-[#c9a24a] opacity-[0.1] blur-3xl" />
        </>
      )}
      <canvas ref={ref} className="absolute inset-0" />
    </div>
  );
}
