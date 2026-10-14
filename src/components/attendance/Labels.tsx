"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { LabelDef } from "@/lib/attendance/calc";
import { LabelPill, LDialog } from "./ledger-ui";

export type LabelActions = {
  add: (memberIds: string[], labelId: string, note?: string, until?: string | null) => Promise<void>;
  remove: (memberId: string, labelId: string) => Promise<void>;
  snooze: (memberId: string, days: number) => Promise<void>;
  save: (def: Partial<LabelDef> & { id?: string }) => Promise<void>;
  del: (id: string) => Promise<void>;
  move: (id: string, dir: -1 | 1) => Promise<void>;
  setMisses: (n: number) => Promise<void>;
};

const COLORS = ["#C0392B", "#2F7F86", "#2E7D4F", "#7B4FA0", "#B5546A", "#3B82B6", "#4F5BB5", "#C08A1E", "#B8892E", "#8C93A3", "#4B5563", "#1E2A44"];
const EMOJIS = ["🔔", "📞", "🏠", "🙏", "🤒", "✈️", "🎓", "🚗", "🌱", "👋", "🎉", "📦", "⛪", "🚫", "❤️", "⭐", "📖", "🎶", "👶", "🧓", "🍞", "🕯️", "✝️", "🎂", "💼", "🧳", "📅", "🤝"];

// Pick a label, add an optional note / end date, apply. Used for one member or a selection.
export function AddLabel({ defs, onAdd, label = "Label", compact = false }: { defs: LabelDef[]; onAdd: (labelId: string, note: string, until: string | null) => Promise<void> | void; label?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<LabelDef | null>(null);
  const [note, setNote] = useState("");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);

  function close() { setOpen(false); setPick(null); setNote(""); setUntil(""); }
  async function apply(d: LabelDef) {
    setBusy(true);
    await onAdd(d.id, note, until || null);
    setBusy(false);
    close();
  }
  return (
    <div className="relative inline-block" ref={box}>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} aria-haspopup="dialog" aria-expanded={open}
        className={compact ? "l-chip !min-h-7 !px-2 !py-0.5 !text-xs" : "l-btn"}>
        <Plus size={compact ? 12 : 16} /> {label}
      </button>
      {open && (
        <div role="dialog" aria-label="Add a label" className="l-pop absolute start-0 top-full z-30 mt-1 w-72 max-w-[85vw] p-2" onClick={(e) => e.stopPropagation()}>
          {!pick ? (
            <ul className="max-h-72 overflow-auto">
              {defs.filter((d) => d.active).map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => (d.excuses || d.days ? setPick(d) : apply(d))} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-[var(--l-hover)]">
                    <span aria-hidden>{d.emoji}</span>
                    <span className="me-auto">{d.name}</span>
                    {(d.excuses || d.days) && <span className="l-mute text-xs">date</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2 p-1">
              <LabelPill def={pick} />
              <label className="block text-xs font-semibold">Ends on (optional)
                <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="l-input mt-1 w-full" />
              </label>
              <label className="block text-xs font-semibold">Note (optional)
                <input value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder="Short note" className="l-input mt-1 w-full" />
              </label>
              <p className="l-mute text-xs">Never write medical details here.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPick(null)} className="l-btn flex-1">Back</button>
                <button type="button" disabled={busy} onClick={() => apply(pick)} className="l-btn l-btn-primary flex-1">Add</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ManageLabels({ defs, actions, onClose, misses, canSetMisses }: { defs: LabelDef[]; actions: LabelActions; onClose: () => void; misses: number; canSetMisses: boolean }) {
  const [edit, setEdit] = useState<Partial<LabelDef> | null>(null);
  const [busy, setBusy] = useState(false);
  const sorted = [...defs].sort((a, b) => a.order - b.order);

  async function save() {
    if (!edit?.name?.trim()) return toast.error("Give the label a name");
    setBusy(true);
    await actions.save({ ...edit, name: edit.name.trim() });
    setBusy(false);
    setEdit(null);
  }

  return (
    <LDialog title="Manage labels" onClose={onClose} wide>
      {edit ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Name (English)
              <input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="l-input mt-1 w-full" autoFocus />
            </label>
            <label className="text-sm font-semibold">الاسم (عربي)
              <input dir="rtl" lang="ar" value={edit.nameAr ?? ""} onChange={(e) => setEdit({ ...edit, nameAr: e.target.value })} className="l-input mt-1 w-full" />
            </label>
          </div>
          <label className="block text-sm font-semibold">Description
            <input value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="l-input mt-1 w-full" />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold">Emoji</legend>
            <div className="mt-1 flex flex-wrap gap-1">
              {EMOJIS.map((em) => (
                <button key={em} type="button" aria-pressed={edit.emoji === em} onClick={() => setEdit({ ...edit, emoji: em })}
                  className={`grid h-9 w-9 place-items-center rounded-lg border text-lg ${edit.emoji === em ? "border-[var(--l-gold)] bg-[var(--l-hover)]" : "border-[var(--l-line)]"}`}>{em}</button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold">Color</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={edit.color === c} onClick={() => setEdit({ ...edit, color: c })}
                  className="h-8 w-8 rounded-full border-2" style={{ background: c, borderColor: edit.color === c ? "var(--l-ink)" : "transparent" }} />
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(edit.excuses)} onChange={(e) => setEdit({ ...edit, excuses: e.target.checked })} />
            Excuses the person from follow-up while active (traveling, sick…)
          </label>
          <div className="flex gap-2">
            <button onClick={() => setEdit(null)} className="l-btn flex-1">Cancel</button>
            <button disabled={busy} onClick={save} className="l-btn l-btn-primary flex-1">Save label</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--l-line)] bg-[var(--l-soft)] px-3 py-2 text-sm">
            <span className="me-auto">🔔 Add “Follow up needed” after</span>
            <input type="number" min={1} max={12} defaultValue={misses} disabled={!canSetMisses} aria-label="Missed services in a row" className="l-input !min-h-9 w-20 text-center"
              onBlur={(e) => { const n = Math.max(1, Math.min(12, Number(e.target.value) || misses)); if (n !== misses) actions.setMisses(n); }} />
            <span>missed services in a row</span>
            {!canSetMisses && <span className="l-mute w-full text-xs">Only the super admin can change this (it is shared by all churches).</span>}
          </label>
          <ul className="divide-y divide-[var(--l-line)] rounded-xl border border-[var(--l-line)]">
            {sorted.map((d, i) => (
              <li key={d.id} className={`flex flex-wrap items-center gap-2 px-3 py-2 ${d.active ? "" : "opacity-50"}`}>
                <LabelPill def={d} />
                <span className="l-mute me-auto text-xs">{d.system ? "System" : d.description}</span>
                <button aria-label={`Move ${d.name} up`} disabled={i === 0} onClick={() => actions.move(d.id, -1)} className="l-btn l-btn-ghost !min-h-8 !px-1.5"><ArrowUp size={14} /></button>
                <button aria-label={`Move ${d.name} down`} disabled={i === sorted.length - 1} onClick={() => actions.move(d.id, 1)} className="l-btn l-btn-ghost !min-h-8 !px-1.5"><ArrowDown size={14} /></button>
                <button onClick={() => setEdit(d)} className="l-btn !min-h-8 !px-2 text-xs">Edit</button>
                <button onClick={() => actions.save({ id: d.id, active: !d.active })} className="l-btn !min-h-8 !px-2 text-xs">{d.active ? "Turn off" : "Turn on"}</button>
                {!d.system && (
                  <button aria-label={`Delete ${d.name}`} onClick={() => { if (window.confirm(`Delete the label "${d.name}"? It is removed from everyone.`)) actions.del(d.id); }} className="l-btn l-btn-ghost !min-h-8 !px-1.5 text-[var(--t-absent)]"><Trash2 size={14} /></button>
                )}
              </li>
            ))}
          </ul>
          <button onClick={() => setEdit({ emoji: "🏷️", color: COLORS[1], name: "", nameAr: "", description: "", excuses: false })} className="l-btn l-btn-primary"><Plus size={16} /> New label</button>
        </div>
      )}
    </LDialog>
  );
}

export const ManageButton = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="l-btn" aria-label="Manage labels"><Settings2 size={16} /> Labels</button>
);
