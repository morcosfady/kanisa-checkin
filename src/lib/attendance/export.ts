import { pct, type Raw, type Row, type Sheet } from "./calc";

// Excel workbook: ranked list, register matrix (1/0), follow-up list, label history
export async function exportXlsx(sheet: Sheet, raw: Raw, church: string, periodText: string) {
  const XLSX = await import("xlsx");
  const defs = new Map(raw.labels.map((l) => [l.id, l]));
  const nameOf = new Map(raw.members.map((m) => [m.id, `${m.first} ${m.last}`.trim()]));
  const names = (r: Row) => r.labels.map((l) => l.def.name).join(", ");

  const ranked = sheet.rows.map((r) => ({
    Rank: r.rank, Member: r.name, Family: r.family, Tier: r.tier, Present: r.present, Possible: r.possible, "Rate %": r.rate === null ? "" : Math.round(r.rate * 100),
    Streak: r.streak, "Last attended": r.lastAttended ?? "", "Avg minutes late": r.avgLate, Labels: names(r),
  }));

  const here = new Set(raw.present.map(([m, s]) => `${m}|${s}`));
  const matrix = sheet.rows.map((r) => {
    const o: Record<string, string | number> = { Member: r.name };
    sheet.services.forEach((s) => { o[`${s.date} ${s.name}`] = s.date < r.joined ? "" : here.has(`${r.id}|${s.id}`) ? 1 : 0; });
    return o;
  });

  const followup = sheet.rows.filter((r) => r.followup).map((r) => ({
    Member: r.name, Family: r.family, "Missed in a row": r.streak < 0 ? -r.streak : 0, "Last attended": r.lastAttended ?? "", Labels: names(r),
  }));

  const history = raw.memberLabels.map((ml) => ({
    Member: nameOf.get(ml.memberId) ?? "", Label: defs.get(ml.labelId)?.name ?? "", "Added by": ml.by ?? "System", Added: ml.addedAt.slice(0, 10),
    Until: ml.until ?? "", Note: ml.note ?? "", Removed: ml.removedAt ? ml.removedAt.slice(0, 10) : "",
  }));

  const wb = XLSX.utils.book_new();
  const add = (n: string, rows: object[]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "Nothing to show" }]), n);
  add("Ranked list", ranked);
  add("Register", matrix);
  add("Follow-up", followup);
  add("Labels history", history);
  XLSX.writeFile(wb, `attendance-${church.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${periodText.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xlsx`);
}

export function summaryAr(s: Sheet) {
  const t = s.totals;
  const parts = [
    `حضر ${t.attendedAtLeastOnce} من ${t.members} عضوًا مرة واحدة على الأقل (${pct(t.members ? t.attendedAtLeastOnce / t.members : null)}).`,
    `متوسط الحضور ${Math.round(t.avgPerService)} شخصًا.`,
    t.followup === 0 ? "لا أحد يحتاج متابعة الآن." : `${t.followup} يحتاجون متابعة.`,
  ];
  return parts.join(" ");
}
