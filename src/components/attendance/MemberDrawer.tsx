"use client";
import { useEffect, useState } from "react";
import { pct, lastSeenText, type LabelDef, type Raw, type Row, type Sheet } from "@/lib/attendance/calc";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AddLabel, type LabelActions } from "./Labels";
import { LAvatar, LabelPill, LDialog, TierBadge } from "./ledger-ui";

type Event = { action: string; label: string; emoji: string; by: string | null; note: string | null; at: string };
const VERB: Record<string, string> = { added: "added", removed: "removed", snoozed: "snoozed", auto_added: "added automatically", auto_removed: "removed automatically" };
const short = (ts: string) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });

// Member side sheet: attendance calendar, labels, label history
export default function MemberDrawer({ row, raw, sheet, defs, today, canEdit, actions, demo, onClose }: {
  row: Row; raw: Raw; sheet: Sheet; defs: LabelDef[]; today: string; canEdit: boolean; actions: LabelActions; demo: boolean; onClose: () => void;
}) {
  const [events, setEvents] = useState<Event[] | null>(null);
  useEffect(() => {
    if (demo) return;
    let off = false;
    supabaseBrowser().rpc("member_label_history", { p_member: row.id }).then(({ data }) => !off && setEvents((data ?? []) as Event[]));
    return () => { off = true; };
  }, [row.id, demo, row.labels.length]);

  const here = new Map(raw.present.filter((p) => p[0] === row.id).map((p) => [p[1], p[2]]));
  const demoEvents: Event[] = row.labels.map(({ ml, def }) => ({ action: ml.by ? "added" : "auto_added", label: def.name, emoji: def.emoji, by: ml.by, note: ml.note, at: ml.addedAt }));
  const list = demo ? demoEvents : events;

  return (
    <LDialog title={row.name} onClose={onClose} side>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <LAvatar name={row.name} gender={row.gender} size={52} />
          <div className="min-w-0">
            <div className="l-mute text-sm">{row.family || "No family listed"}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2"><TierBadge tier={row.tier} /><span className="text-sm"><b>{row.present} / {row.possible}</b> · {pct(row.rate)}</span></div>
            <div className="l-mute mt-1 text-xs">Last attended: {lastSeenText(row.lastAttended, today, row.joined)}</div>
          </div>
        </div>

        <section aria-label="Attendance history">
          <h3 className="l-h mb-2 text-sm">Attendance history</h3>
          {sheet.services.length === 0 ? <p className="l-mute text-sm">No services in this period.</p> : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(3.4rem,1fr))] gap-2">
              {sheet.services.map((s) => {
                const late = here.get(s.id);
                const st = s.date < row.joined ? "na" : late === undefined ? "absent" : late > 0 ? "late" : "present";
                return (
                  <li key={s.id} className="flex flex-col items-center gap-1 text-[11px]" title={`${s.name} · ${s.date}`}>
                    <span className="l-heat !h-5 !w-5" data-s={st} role="img" aria-label={`${s.date}: ${st === "na" ? "not a member yet" : st}`} />
                    <span className="l-mute">{new Date(s.date + "T00:00:00Z").toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "UTC" })}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-label="Labels">
          <h3 className="l-h mb-2 text-sm">Labels</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {row.labels.length === 0 && <span className="l-mute text-sm">No labels.</span>}
            {row.labels.map(({ ml, def }) => <LabelPill key={ml.id} def={def} ml={ml} onRemove={canEdit ? () => actions.remove(row.id, def.id) : undefined} />)}
            {canEdit && <AddLabel compact defs={defs} onAdd={(id, note, until) => actions.add([row.id], id, note, until)} />}
          </div>
          {row.labels.some((l) => l.ml.note) && (
            <ul className="mt-2 space-y-1 text-sm">{row.labels.filter((l) => l.ml.note).map(({ ml, def }) => <li key={ml.id}><span aria-hidden>{def.emoji}</span> {ml.note}</li>)}</ul>
          )}
        </section>

        <section aria-label="Label history">
          <h3 className="l-h mb-2 text-sm">History</h3>
          {list === null ? <p className="l-mute text-sm">Loading…</p> : list.length === 0 ? <p className="l-mute text-sm">Nothing yet.</p> : (
            <ol className="space-y-2 border-s-2 border-[var(--l-line)] ps-3">
              {list.map((e, i) => (
                <li key={i} className="text-sm">
                  <span aria-hidden>{e.emoji}</span> <b>{e.label}</b> {VERB[e.action] ?? e.action}{e.by ? ` by ${e.by}` : ""} <span className="l-mute">· {short(e.at)}{e.note ? ` · ${e.note}` : ""}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </LDialog>
  );
}
