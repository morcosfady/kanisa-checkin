"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Cross, Phone, Users, GraduationCap, X, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Badge, b } from "@/components/ui";
import type { DemoMember } from "@/lib/demo";
import ConfirmDialog from "./ConfirmDialog";
import { FaceIcon, rel, statusTone } from "./MembersView";

function Row({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-3 last:border-0">
      <Icon size={18} strokeWidth={1.75} className="text-goldtext" />
      <span className="text-sm text-muted">{label}</span>
      <span className="ms-auto text-sm font-medium">{value}</span>
    </div>
  );
}

const TABS = ["Overview", "Attendance", "Consent"] as const;

// deterministic pseudo history: ~rate% of the last 52 Sundays
function history(m: DemoMember) {
  const seed = Number(m.id) * 9301;
  return Array.from({ length: 52 }, (_, w) => ((seed + w * 49297) % 233280) / 233280 < m.rate / 100);
}

function recent(m: DemoMember) {
  const out: string[] = [];
  const h = history(m);
  const d = new Date("2026-10-11T12:00:00");
  for (let w = 0; w < 52 && out.length < 6; w++) {
    if (h[51 - w]) {
      const x = new Date(d.getTime() - w * 7 * 86400000);
      out.push(x.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    }
  }
  return out;
}

export default function MemberDrawer({ m, onClose }: { m: DemoMember; onClose: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [confirm, setConfirm] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const h = history(m);

  useEffect(() => {
    closeBtn.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !confirm && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose, confirm]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <motion.aside
        role="dialog" aria-modal="true" aria-label={`${m.name} profile`}
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
        className="fixed inset-y-0 end-0 z-50 flex w-full max-w-md flex-col border-s border-line bg-card shadow-lift"
      >
        <div className="flex items-start gap-4 border-b border-line bg-coptic p-5 text-cream">
          <Avatar name={m.name} gender={m.gender} size={56} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold">{m.name}</h2>
            <p className="text-sm text-cream/75">{m.family} family</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={statusTone[m.status]}>{m.status[0].toUpperCase() + m.status.slice(1)}</Badge>
              {m.deacon && <Badge tone="gold" icon={<Cross size={12} strokeWidth={2} />}>Deacon</Badge>}
              <Badge tone="info">{m.gender === "male" ? "Male" : "Female"}</Badge>
            </div>
          </div>
          <button ref={closeBtn} onClick={onClose} aria-label="Close profile" className="grid h-8 w-8 place-items-center rounded-[8px] hover:bg-white/10"><X size={20} /></button>
        </div>

        <div role="tablist" className="flex border-b border-line px-3">
          {TABS.map((t) => (
            <button
              key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`relative px-4 py-3 text-sm font-medium ${tab === t ? "text-heading" : "text-muted"}`}
            >
              {t}
              {tab === t && <motion.span layoutId="drawer-tab" className="absolute inset-x-3 -bottom-px h-0.5 bg-gold" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "Overview" && (
            <div>
              <Row icon={Phone} label="Phone" value={m.phone} />
              <Row icon={Users} label="Family" value={`${m.family} family`} />
              <Row icon={GraduationCap} label="Class / group" value={m.className} />
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[["Attendance", `${m.rate}%`], ["Streak", `${m.streak} wks`], ["Last seen", rel(m.lastDays)]].map(([l, v]) => (
                  <div key={l} className="rounded-[12px] bg-page p-3">
                    <div className="num font-display text-lg font-semibold text-heading">{v}</div>
                    <div className="text-xs text-muted">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "Attendance" && (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm text-muted">Last 12 months. Each square is a Sunday.</p>
                <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5" role="img" aria-label={`${h.filter(Boolean).length} of 52 Sundays attended`}>
                  {h.map((on, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.008 }}
                      className={`aspect-square rounded-[4px] ${on ? "bg-gold" : "bg-line"}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Recent check-ins</h3>
                <ul className="divide-y divide-line rounded-[12px] border border-line">
                  {recent(m).map((d, i) => (
                    <li key={d} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{d}</span><span className="num text-muted">{`7:${50 + ((i * 3 + Number(m.id)) % 9)} AM`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {tab === "Consent" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-[12px] bg-page p-4">
                {m.consent ? <ShieldCheck className="text-success" /> : <ShieldOff className="text-muted" />}
                <div>
                  <div className="font-medium">{m.consent ? "Face recognition consent given" : "No face consent"}</div>
                  <div className="text-sm text-muted">{m.consent ? "Signed Aug 24, 2026" : "Can still check in by QR or name"}</div>
                </div>
                <span className="ms-auto"><FaceIcon face={m.face} /></span>
              </div>
              {m.consent && (
                <button className={`${b("danger")} w-full border border-danger/30`} onClick={() => setConfirm(true)}>
                  <ShieldOff size={18} strokeWidth={1.75} /> Withdraw consent
                </button>
              )}
            </div>
          )}
        </div>
      </motion.aside>
      <ConfirmDialog
        open={confirm}
        title="Withdraw face consent?"
        body="Face data is deleted immediately and this is logged."
        confirmLabel="Withdraw consent"
        onCancel={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); toast.success(`Consent withdrawn for ${m.name} (demo)`); }}
      />
    </>
  );
}
