"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { TIER_LABEL, type LabelDef, type MemLabel, type Tier } from "@/lib/attendance/calc";

export const TIER_COLOR: Record<Tier, string> = {
  faithful: "var(--t-faithful)", regular: "var(--t-regular)", occasional: "var(--t-occasional)", rarely: "var(--t-rarely)",
  absent: "var(--t-absent)", excused: "var(--t-excused)", nodata: "var(--t-nodata)",
};

export function LAvatar({ name, gender, size = 36 }: { name: string; gender?: string | null; size?: number }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const c = gender === "female" ? "var(--c-rose)" : gender === "male" ? "var(--c-navy)" : "var(--c-slate)";
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full font-semibold" style={{ width: size, height: size, fontSize: size * 0.38, background: `color-mix(in srgb, ${c} 16%, var(--l-card))`, color: c, border: `1px solid color-mix(in srgb, ${c} 30%, transparent)` }}>{ini}</span>
  );
}

export const TierBadge = ({ tier }: { tier: Tier }) => (
  <span className="l-tier" style={{ ["--tier" as string]: TIER_COLOR[tier] }}>{TIER_LABEL[tier]}</span>
);

const fmtDate = (ts: string) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });

export function LabelPill({ def, ml, onRemove }: { def: LabelDef; ml?: MemLabel; onRemove?: () => void }) {
  const tip = ml ? `${def.name}${ml.by ? ` · added by ${ml.by}` : " · added automatically"} · ${fmtDate(ml.addedAt)}${ml.until ? ` · until ${ml.until}` : ""}${ml.note ? ` · ${ml.note}` : ""}` : def.description || def.name;
  return (
    <motion.span initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="l-pill group" style={{ ["--pill" as string]: def.color }} title={tip}>
      <span aria-hidden>{def.emoji}</span>
      {def.name}
      {onRemove && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label={`Remove ${def.name}`}
          className="ms-0.5 grid h-4 w-4 place-items-center rounded-full opacity-60 hover:opacity-100 focus-visible:opacity-100">
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </motion.span>
  );
}

// Centered dialog or side sheet
export function LDialog({ title, onClose, children, side = false, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; side?: boolean; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const prev = document.activeElement as HTMLElement | null;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("keydown", esc); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="l-overlay ledger-portal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        initial={side ? { x: 40, opacity: 0 } : { y: 16, opacity: 0 }} animate={side ? { x: 0, opacity: 1 } : { y: 0, opacity: 1 }}
        className={`l-pop l-scroll fixed outline-none ${side ? "inset-y-0 end-0 w-full max-w-md rounded-e-none" : `start-1/2 top-1/2 max-h-[88vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 ${wide ? "max-w-2xl" : "max-w-md"}`}`}
      >
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--l-line)] bg-[var(--l-card)] px-4 py-3">
          <h2 className="l-h me-auto text-lg">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="l-btn l-btn-ghost !min-h-9 !px-2"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </motion.div>
    </div>
  );
}
