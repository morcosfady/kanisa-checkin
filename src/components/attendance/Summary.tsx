"use client";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Bell, Gauge, Heart, Minus, Users } from "lucide-react";
import { CountUp } from "@/components/ui";
import { summaryText, trend, type Sheet } from "@/lib/attendance/calc";

function Tile({ label, value, suffix, icon: Icon, tone, delta, onClick, hint }: {
  label: string; value: number; suffix?: string; icon: typeof Users; tone?: string; delta?: { dir: "up" | "down" | "flat" | "none"; pct: number; goodWhenDown?: boolean }; onClick?: () => void; hint?: string;
}) {
  const body = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${tone ?? "var(--l-gold)"} 16%, var(--l-card))`, color: tone ?? "var(--l-goldtext)" }}><Icon size={20} strokeWidth={1.75} /></span>
      <span className="min-w-0 flex-1 text-start">
        <span className="l-mute block text-sm">{label}</span>
        <span className="l-h block text-3xl leading-tight" style={tone ? { color: tone } : undefined}><CountUp value={value} suffix={suffix} /></span>
        {hint && <span className="l-mute block text-xs">{hint}</span>}
      </span>
      {delta && delta.dir !== "none" && (
        <span className="flex items-center gap-0.5 text-xs font-bold" aria-label={`${delta.dir} ${delta.pct} percent from the previous period`}
          style={{ color: delta.dir === "flat" ? "var(--l-mute)" : (delta.dir === "up") !== Boolean(delta.goodWhenDown) ? "var(--t-faithful)" : "var(--t-absent)" }}>
          {delta.dir === "up" ? <ArrowUp size={14} /> : delta.dir === "down" ? <ArrowDown size={14} /> : <Minus size={14} />}{delta.pct}%
        </span>
      )}
    </>
  );
  const cls = "l-card flex items-center gap-3 p-4";
  return onClick ? (
    <motion.button whileHover={{ y: -2 }} onClick={onClick} className={`${cls} w-full cursor-pointer`}>{body}</motion.button>
  ) : (
    <motion.div whileHover={{ y: -2 }} className={cls}>{body}</motion.div>
  );
}

export default function Summary({ sheet, periodLabel, serviceName, onFollowup }: { sheet: Sheet; periodLabel: string; serviceName?: string; onFollowup: () => void }) {
  const t = sheet.totals;
  return (
    <section aria-labelledby="abouna-summary" className="space-y-4">
      <div className="l-card p-5" style={{ borderInlineStart: "4px solid var(--l-burg)" }}>
        <h2 id="abouna-summary" className="l-h flex items-center gap-2 text-lg"><Heart size={18} className="l-gold" /> Abouna’s summary</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed">{summaryText(sheet, periodLabel, serviceName)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Average per service" value={Math.round(t.avgPerService)} icon={Users} tone="var(--c-navy)" delta={trend(t.avgPerService, t.prevAvgPerService)} hint={`${sheet.services.length} ${sheet.services.length === 1 ? "service" : "services"}`} />
        <Tile label="Attendance rate" value={Math.round((t.rate ?? 0) * 100)} suffix="%" icon={Gauge} tone="var(--t-regular)" delta={trend(t.rate, t.prevRate)} hint="present ÷ possible" />
        <Tile label="Faithful members (90%+)" value={t.faithful} icon={Heart} tone="var(--t-faithful)" hint={`of ${t.members} members`} />
        <Tile label="Need follow-up" value={t.followup} icon={Bell} tone="var(--t-absent)" onClick={onFollowup} hint="tap to see who" />
      </div>
    </section>
  );
}
