"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Medal, Rows3, Search, Tags } from "lucide-react";
import { SORTS, TIERS, TIER_LABEL, lastSeenText, pct, type LabelDef, type Row, type SortKey, type Tier } from "@/lib/attendance/calc";
import { AddLabel, type LabelActions } from "./Labels";
import { LAvatar, LabelPill, TierBadge, TIER_COLOR } from "./ledger-ui";

export type Filter = { tier: Tier | "all" | "followup"; label: string | null; q: string; sort: SortKey };
export const DEFAULT_FILTER: Filter = { tier: "all", label: null, q: "", sort: "most" };

export function applyFilter(rows: Row[], f: Filter): Row[] {
  const q = f.q.trim().toLowerCase();
  return rows
    .filter((r) => (f.tier === "all" ? true : f.tier === "followup" ? r.followup : r.tier === f.tier))
    .filter((r) => !f.label || r.labels.some((l) => l.def.id === f.label))
    .filter((r) => !q || r.name.toLowerCase().includes(q) || r.family.toLowerCase().includes(q))
    .sort(SORTS[f.sort]);
}

const MEDAL = ["#C9A24A", "#9AA3B2", "#B07A4A"];
const PAGE = 25;
// phones start in the compact list (one line per person)
const phoneQuery = "(max-width: 640px)";
const subPhone = (cb: () => void) => { const m = window.matchMedia(phoneQuery); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const isPhoneNow = () => window.matchMedia(phoneQuery).matches;
const COLS = "grid items-start gap-x-3 grid-cols-[1.25rem_2rem_minmax(0,1fr)] md:grid-cols-[1.25rem_2rem_minmax(0,1fr)_9rem_8rem_7rem]";

function Spark({ dots }: { dots: (boolean | null)[] }) {
  return (
    <span className="inline-flex gap-[3px]" role="img" aria-label={`Last ${dots.length} services: ${dots.filter(Boolean).length} present`}>
      {dots.map((d, i) => (
        <span key={i} className="h-2.5 w-2.5 rounded-full border" style={{ background: d ? "var(--t-faithful)" : "transparent", borderColor: d === null ? "var(--l-line)" : d ? "var(--t-faithful)" : "var(--l-mute)", opacity: d === null ? 0.4 : 1 }} />
      ))}
    </span>
  );
}

function StreakText({ streak }: { streak: number }) {
  if (streak >= 2) return <span className="text-xs font-semibold" style={{ color: "var(--t-faithful)" }}>🔥 {streak} in a row</span>;
  if (streak <= -2) return <span className="text-xs font-semibold" style={{ color: "var(--t-absent)" }}>Missed {-streak} in a row</span>;
  return null;
}

export default function RankedList({
  rows, total, filter, setFilter, tierCounts, defs, today, canEdit, selected, setSelected, onOpen, actions, labelCounts,
}: {
  rows: Row[]; total: number; filter: Filter; setFilter: (f: Filter) => void; tierCounts: Record<Tier | "followup", number>; defs: LabelDef[]; today: string; canEdit: boolean;
  selected: Set<string>; setSelected: (s: Set<string>) => void; onOpen: (r: Row) => void; actions: LabelActions; labelCounts: Map<string, number>;
}) {
  const [shown, setShown] = useState(PAGE);
  const phone = useSyncExternalStore(subPhone, isPhoneNow, () => false);
  const [pref, setPref] = useState<boolean | null>(null);
  const compact = pref ?? phone;
  const visible = rows.slice(0, shown);
  const allOn = visible.length > 0 && visible.every((r) => selected.has(r.id));
  const usedLabels = useMemo(() => defs.filter((d) => d.active && (labelCounts.get(d.id) ?? 0) > 0), [defs, labelCounts]);
  const set = (p: Partial<Filter>) => { setShown(PAGE); setFilter({ ...filter, ...p }); };
  const toggle = (id: string) => { const n = new Set(selected); if (n.has(id)) n.delete(id); else n.add(id); setSelected(n); };

  const chips: [Filter["tier"], string, number | undefined][] = [
    ["all", "All", total], ...TIERS.map((t) => [t, TIER_LABEL[t], tierCounts[t]] as [Tier, string, number]), ["followup", "Needs follow-up", tierCounts.followup],
  ];

  return (
    <section aria-labelledby="who-h" className="l-card min-w-0 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 id="who-h" className="l-h me-auto text-lg">Who attends</h2>
        <label className="relative">
          <span className="sr-only">Search by name or family</span>
          <Search size={16} className="l-mute pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" />
          <input value={filter.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search name or family" className="l-input ps-9" />
        </label>
        <button type="button" aria-pressed={compact} onClick={() => setPref(!compact)} className="l-chip"><Rows3 size={14} /> Compact</button>
        <label>
          <span className="sr-only">Sort by</span>
          <select value={filter.sort} onChange={(e) => set({ sort: e.target.value as SortKey })} className="l-select">
            <option value="most">Most attended</option><option value="least">Least attended</option><option value="absent">Longest absent</option>
            <option value="late">Most late</option><option value="name">Name A to Z</option><option value="recent">Recently added</option>
          </select>
        </label>
      </div>

      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter by tier">
        {chips.map(([k, name, n]) => (
          <button key={k} type="button" aria-pressed={filter.tier === k && !filter.label} onClick={() => set({ tier: k, label: null })} className="l-chip">
            {k !== "all" && k !== "followup" && <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: TIER_COLOR[k as Tier] }} />}
            {k === "followup" && <span aria-hidden>🔔</span>}
            {name} <span className="opacity-70">{n}</span>
          </button>
        ))}
        {usedLabels.length > 0 && (
          <label className="flex items-center gap-1">
            <Tags size={14} className="l-mute" />
            <span className="sr-only">Filter by label</span>
            <select value={filter.label ?? ""} onChange={(e) => set({ label: e.target.value || null, tier: "all" })} className="l-select !min-h-8 !py-0.5 text-xs">
              <option value="">Any label</option>
              {usedLabels.map((d) => <option key={d.id} value={d.id}>{d.emoji} {d.name} ({labelCounts.get(d.id)})</option>)}
            </select>
          </label>
        )}
      </div>

      {canEdit && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--l-gold)] bg-[var(--l-soft)] px-3 py-2" role="region" aria-label="Selected members">
          <span className="me-auto text-sm font-semibold">{selected.size} selected</span>
          <AddLabel defs={defs} label="Add label to selected" onAdd={async (id, note, until) => { await actions.add([...selected], id, note, until); setSelected(new Set()); }} />
          <button onClick={() => setSelected(new Set())} className="l-btn">Clear</button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="l-mute py-10 text-center">Nobody matches these filters.</p>
      ) : (
        <>
          <div className={`${COLS} l-mute hidden px-2 pb-1 text-xs font-semibold uppercase tracking-wide ${compact ? "" : "md:grid"}`}>
            {canEdit ? (
              <input type="checkbox" aria-label="Select all shown" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set([...selected, ...visible.map((r) => r.id)]))} />
            ) : <span />}
            <span className="text-center">#</span><span>Member</span><span>Attendance</span><span>Last 8 · streak</span><span>Last attended</span>
          </div>
          <ol>
            {visible.map((r, i) => (
              <motion.li key={r.id} initial={i < 15 ? { opacity: 0, y: 6 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: i < 15 ? i * 0.02 : 0 }}
                className="l-row cursor-pointer px-2 py-3" onClick={() => onOpen(r)}>
                {compact ? (
                  <div className="flex items-center gap-2">
                    {canEdit && <input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(r.id)} />}
                    <span className="w-6 shrink-0 text-center text-xs font-bold" aria-label={`Rank ${r.rank}`}>{r.rank <= 3 && r.present > 0 ? <Medal size={16} style={{ color: MEDAL[r.rank - 1] }} /> : r.rank}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.name}</span>
                    {r.deacon && <span className="l-pill" style={{ ["--pill" as string]: "#B8892E" }}>Deacon</span>}
                    <TierBadge tier={r.tier} />
                    <span className="w-10 shrink-0 text-end text-xs font-bold">{pct(r.rate)}</span>
                  </div>
                ) : (
                <div className={`${COLS} gap-y-2`}>
                  {canEdit ? <input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(r.id)} /> : <span />}
                  <span className="grid place-items-center text-sm font-bold" aria-label={`Rank ${r.rank}`}>
                    {r.rank <= 3 && r.present > 0 ? <Medal size={22} style={{ color: MEDAL[r.rank - 1] }} aria-label={["Gold", "Silver", "Bronze"][r.rank - 1]} /> : r.rank}
                  </span>
                  <div className="flex min-w-0 items-center gap-3">
                    <LAvatar name={r.name} gender={r.gender} size={38} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{r.name}</div>
                      <div className="l-mute truncate text-xs">{r.family || "—"}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1"><TierBadge tier={r.tier} />{r.deacon && <span className="l-pill" style={{ ["--pill" as string]: "#B8892E" }}>Deacon</span>}</div>
                    </div>
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    {r.rate === null ? <span className="l-mute text-xs">No data</span> : (
                      <>
                        <div className="l-bar" role="img" aria-label={`${pct(r.rate)} attended`}><span style={{ width: `${r.rate * 100}%`, background: TIER_COLOR[r.tier] }} /></div>
                        <div className="mt-0.5 text-xs"><b>{r.present} / {r.possible}</b> <span className="l-mute">· {pct(r.rate)}</span></div>
                      </>
                    )}
                  </div>
                  <div className="col-span-3 space-y-1 md:col-span-1"><Spark dots={r.spark} /><div><StreakText streak={r.streak} /></div></div>
                  <div className="col-span-3 text-xs md:col-span-1">
                    <div>{lastSeenText(r.lastAttended, today, r.joined)}</div>
                    <div className="l-mute">{r.present === 0 ? "—" : r.avgLate > 0 ? `+${r.avgLate} min late` : "On time"}</div>
                  </div>
                </div>
                )}
                <div className={`mt-2 flex flex-wrap items-center gap-1.5 ${compact ? "ps-8" : "md:ps-[4.5rem]"}`} onClick={(e) => e.stopPropagation()}>
                  {r.labels.map(({ ml, def }) => <LabelPill key={ml.id} def={def} ml={ml} onRemove={canEdit ? () => actions.remove(r.id, def.id) : undefined} />)}
                  {canEdit && <AddLabel compact defs={defs} label="Label" onAdd={(id, note, until) => actions.add([r.id], id, note, until)} />}
                </div>
              </motion.li>
            ))}
          </ol>
          {rows.length > shown && (
            <div className="mt-3 text-center">
              <button onClick={() => setShown(shown + PAGE)} className="l-btn">Show more ({rows.length - shown} left)</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
