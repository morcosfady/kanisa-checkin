"use client";
import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

export type Tone = "success" | "warning" | "danger" | "info" | "gold" | "gray" | "red";

const TONES: Record<Tone, string> = {
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
  info: "bg-info-tint text-info",
  gold: "bg-gold/20 text-goldtext",
  gray: "bg-line text-muted",
  red: "bg-coptic text-white",
};

export function Badge({ tone = "gray", icon, children }: { tone?: Tone; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-[12px] px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

// Buttons: primary burgundy, secondary outline, ghost, danger ghost
export const btn = {
  base: "inline-flex items-center justify-center gap-2 rounded-[12px] px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60",
  primary: "bg-coptic text-white shadow-soft hover:bg-coptic-dark",
  secondary: "border border-line bg-card text-ink hover:bg-hover",
  ghost: "text-ink hover:bg-hover",
  danger: "text-danger hover:bg-danger-tint",
};
export const b = (v: keyof Omit<typeof btn, "base">) => `${btn.base} ${btn[v]}`;

export const card = "rounded-[16px] border border-line bg-card shadow-soft";

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export function Avatar({ name, gender, size = 36 }: { name: string; gender?: string; size?: number }) {
  const tone = gender === "male" ? "bg-info-tint text-info" : gender === "female" ? "bg-[#f7dfe4] text-[#9a2f4b] dark:bg-[#4a2230] dark:text-[#f2b8c6]" : "bg-line text-muted";
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${tone}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const c = animate(0, value, { duration: 0.9, ease: "easeOut", onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [value, reduce]);
  return <span className="num">{reduce ? value : n}{suffix}</span>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}
