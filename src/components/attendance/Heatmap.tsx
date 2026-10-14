"use client";
import { useMemo, useState } from "react";
import { activeOn, type LabelDef, type MemLabel, type Raw, type Row, type Sheet } from "@/lib/attendance/calc";

const md = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "UTC" });
const LIMIT = 80;

// The register: one square per member per service.
export default function Heatmap({ raw, sheet, rows, onOpen }: { raw: Raw; sheet: Sheet; rows: Row[]; onOpen: (r: Row) => void }) {
  const [all, setAll] = useState(false);
  const presence = useMemo(() => {
    const m = new Map<string, number>();
    raw.present.forEach(([mid, sid, late]) => m.set(`${mid}|${sid}`, late));
    return m;
  }, [raw.present]);
  const defs = useMemo(() => new Map<string, LabelDef>(raw.labels.map((l) => [l.id, l])), [raw.labels]);
  const mls = useMemo(() => {
    const m = new Map<string, MemLabel[]>();
    raw.memberLabels.forEach((x) => m.set(x.memberId, [...(m.get(x.memberId) ?? []), x]));
    return m;
  }, [raw.memberLabels]);

  const shown = all ? rows : rows.slice(0, LIMIT);
  const state = (r: Row, s: Sheet["services"][number]) => {
    if (s.date < r.joined) return "na";
    const late = presence.get(`${r.id}|${s.id}`);
    if (late !== undefined) return late > 0 ? "late" : "present";
    if ((mls.get(r.id) ?? []).some((ml) => defs.get(ml.labelId)?.excuses && activeOn(ml, s.date))) return "excused";
    return "absent";
  };
  const text = { present: "present", late: "present, late", excused: "excused", absent: "absent", na: "not a member yet" } as const;

  return (
    <section aria-labelledby="register-h" className="l-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2 id="register-h" className="l-h me-auto text-base">The register</h2>
        <ul className="l-mute flex flex-wrap items-center gap-3 text-xs">
          <li className="flex items-center gap-1"><span className="l-heat" data-s="present" /> Present</li>
          <li className="flex items-center gap-1"><span className="l-heat" data-s="late" /> Late</li>
          <li className="flex items-center gap-1"><span className="l-heat" /> Absent</li>
          <li className="flex items-center gap-1"><span className="l-heat" data-s="excused" /> Excused</li>
        </ul>
      </div>
      {sheet.services.length === 0 ? (
        <p className="l-mute py-6 text-center text-sm">No services in this period.</p>
      ) : (
        <div className="rounded-xl border border-[var(--l-line)]" style={{ overflowX: "auto", overflowY: "hidden", touchAction: "pan-x pan-y" }} tabIndex={0} aria-label="Attendance register, scrolls sideways">
          <table className="border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="sticky start-0 top-0 z-20 min-w-44 bg-[var(--l-card)] px-3 py-2 text-start font-semibold">Member</th>
                {sheet.services.map((s) => (
                  <th key={s.id} title={`${s.name} · ${s.date}`} className="sticky top-0 z-10 bg-[var(--l-card)] px-0.5 py-2 text-center font-normal l-mute">
                    <span className="block" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{md(s.date)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="group">
                  <th scope="row" className="sticky start-0 z-10 border-t border-[var(--l-line)] bg-[var(--l-card)] px-3 py-1 text-start font-medium">
                    <button onClick={() => onOpen(r)} className="max-w-40 truncate text-start hover:underline">{r.name}</button>
                  </th>
                  {sheet.services.map((s) => {
                    const st = state(r, s);
                    return (
                      <td key={s.id} className="border-t border-[var(--l-line)] px-0.5 py-1 text-center">
                        <span className="l-heat mx-auto block" data-s={st} role="img" aria-label={`${r.name}, ${md(s.date)}: ${text[st]}`} title={`${r.name} · ${md(s.date)} · ${text[st]}`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > LIMIT && (
        <button onClick={() => setAll(!all)} className="l-btn mt-3">{all ? `Show first ${LIMIT}` : `Show all ${rows.length} members`}</button>
      )}
    </section>
  );
}
