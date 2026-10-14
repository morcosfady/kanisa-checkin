// Attendance maths for the sheet. Pure functions, no database, fully tested (tests/unit/attendance.test.ts).
// Dates are "YYYY-MM-DD" strings (church time), so comparing strings compares days.

export type Svc = { id: string; name: string; type: string; date: string; start: string };
export type Mem = { id: string; first: string; last: string; family: string | null; gender: string | null; deacon: boolean; status: string; joined: string; dob: string | null };
export type LabelDef = {
  id: string; key: string | null; name: string; nameAr: string; emoji: string; color: string; description: string;
  system: boolean; auto: boolean; excuses: boolean; hides: boolean; days: number | null; order: number; active: boolean;
};
export type MemLabel = { id: string; memberId: string; labelId: string; addedAt: string; by: string | null; note: string | null; until: string | null; snooze: string | null; removedAt: string | null };
export type Raw = {
  services: Svc[]; members: Mem[]; present: [string, string, number][]; labels: LabelDef[]; memberLabels: MemLabel[]; followupMisses: number;
};

export type Tier = "faithful" | "regular" | "occasional" | "rarely" | "absent" | "excused" | "nodata";
export const TIERS: Tier[] = ["faithful", "regular", "occasional", "rarely", "absent"];
export const TIER_LABEL: Record<Tier, string> = {
  faithful: "Faithful", regular: "Regular", occasional: "Occasional", rarely: "Rarely", absent: "Absent", excused: "Excused", nodata: "No data",
};
export const TIER_RANGE: Record<Tier, string> = {
  faithful: "90–100%", regular: "70–89%", occasional: "40–69%", rarely: "1–39%", absent: "0%", excused: "", nodata: "",
};

export function tierOf(present: number, possible: number): Tier {
  if (possible <= 0) return "nodata";
  if (present <= 0) return "absent";
  const r = present / possible;
  if (r >= 0.9) return "faithful";
  if (r >= 0.7) return "regular";
  if (r >= 0.4) return "occasional";
  return "rarely";
}

// ---------- periods ----------
export type PeriodKey = "week" | "4w" | "8w" | "12w" | "month" | "lastmonth" | "year" | "custom";
export type Period = { from: string; to: string; prevFrom: string; prevTo: string; label: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(s + "T00:00:00Z");
export const addDays = (s: string, n: number) => iso(new Date(parse(s).getTime() + n * 86400000));
const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

export function resolvePeriod(key: PeriodKey, today: string, custom?: { from: string; to: string }): Period {
  let from: string, to: string, label: string;
  const d = parse(today);
  if (key === "week") {
    from = addDays(today, -((d.getUTCDay() + 6) % 7)); to = today; label = "This week";
  } else if (key === "4w" || key === "8w" || key === "12w") {
    const w = key === "4w" ? 4 : key === "8w" ? 8 : 12;
    from = addDays(today, -w * 7 + 1); to = today; label = `Last ${w} weeks`;
  } else if (key === "month") {
    from = iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))); to = today; label = "This month";
  } else if (key === "lastmonth") {
    from = iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1))); to = iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0))); label = "Last month";
  } else if (key === "year") {
    from = `${d.getUTCFullYear()}-01-01`; to = today; label = "This year";
  } else {
    from = custom?.from ?? addDays(today, -55); to = custom?.to ?? today; label = "Custom range";
  }
  if (from > to) [from, to] = [to, from];
  const len = daysBetween(from, to) + 1;
  return { from, to, prevFrom: addDays(from, -len), prevTo: addDays(from, -1), label };
}

// ---------- labels ----------
const day = (ts: string) => ts.slice(0, 10);

// Is this label row in force on a date?
export function activeOn(ml: MemLabel, date: string) {
  if (day(ml.addedAt) > date) return false;
  if (ml.removedAt && day(ml.removedAt) < date) return false;
  if (ml.until && ml.until < date) return false;
  return true;
}

// ---------- the sheet ----------
export type Options = {
  from: string; to: string; today: string;
  serviceName?: string;          // only count this kind of service
  countExcusedAsAbsent?: boolean;
  lateAfter?: number;            // minutes; late_minutes in the data is already past the grace time, so > 0 means late
};

export type Row = {
  id: string; name: string; first: string; family: string; gender: string | null; deacon: boolean; status: string; joined: string; dob: string | null;
  present: number; possible: number; rate: number | null; tier: Tier;
  streak: number;               // > 0 present in a row, < 0 missed in a row
  lastAttended: string | null;  // service date
  spark: (boolean | null)[];    // last 8 services in the period (null = not possible for them)
  lateCount: number; avgLate: number;
  labels: { ml: MemLabel; def: LabelDef }[];
  excused: boolean;             // excused by a label now
  followup: boolean;            // follow-up label active and not snoozed
  hidden: boolean;              // "moved away"
  prevRate: number | null;
  rank: number;
};

export type Sheet = {
  services: Svc[];
  rows: Row[];
  hiddenCount: number;
  perService: { id: string; name: string; date: string; count: number; late: number; men: number; women: number; deacons: number; prevCount?: number }[];
  totals: {
    avgPerService: number; prevAvgPerService: number | null;
    rate: number | null; prevRate: number | null;
    attendedAtLeastOnce: number; members: number;
    tiers: Record<Tier, number>;
    faithful: number; followup: number; excused: number;
    lateCount: number; onTimeCount: number;
  };
  lateBuckets: { label: string; count: number }[];
  welcomeBack: Row[];
  newcomers: Row[];
  birthdays: Row[];
};

const fullName = (m: Mem) => `${m.first} ${m.last}`.trim();

function filterServices(all: Svc[], from: string, to: string, name?: string) {
  return all.filter((s) => s.date >= from && s.date <= to && (!name || s.name === name));
}

export function computeSheet(raw: Raw, o: Options): Sheet {
  const defs = new Map(raw.labels.map((l) => [l.id, l]));
  const byMember = new Map<string, MemLabel[]>();
  raw.memberLabels.forEach((ml) => byMember.set(ml.memberId, [...(byMember.get(ml.memberId) ?? []), ml]));
  const presentBy = new Map<string, Map<string, number>>(); // member -> service -> late minutes
  raw.present.forEach(([m, s, late]) => {
    const inner = presentBy.get(m) ?? new Map<string, number>();
    inner.set(s, late);
    presentBy.set(m, inner);
  });

  const services = filterServices(raw.services, o.from, o.to, o.serviceName).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const len = daysBetween(o.from, o.to) + 1;
  const prevFrom = addDays(o.from, -len), prevTo = addDays(o.from, -1);
  const prevServices = filterServices(raw.services, prevFrom, prevTo, o.serviceName);

  const excusedOn = (memberId: string, date: string) =>
    (byMember.get(memberId) ?? []).some((ml) => defs.get(ml.labelId)?.excuses && activeOn(ml, date));

  function stats(m: Mem, list: Svc[]) {
    const pres = presentBy.get(m.id);
    let present = 0, possible = 0;
    for (const s of list) {
      if (s.date < m.joined) continue;
      const ex = excusedOn(m.id, s.date);
      const here = pres?.has(s.id) ?? false;
      if (here) { present++; possible++; }
      else if (!ex || o.countExcusedAsAbsent) possible++;
    }
    return { present, possible };
  }

  const rows: Row[] = [];
  let hiddenCount = 0;
  for (const m of raw.members) {
    const mls = byMember.get(m.id) ?? [];
    const hidden = mls.some((ml) => defs.get(ml.labelId)?.hides && activeOn(ml, o.today));
    if (hidden || m.status === "inactive") { if (hidden) hiddenCount++; continue; }
    const pres = presentBy.get(m.id);
    const { present, possible } = stats(m, services);
    const prev = stats(m, prevServices);
    // streak counts back from the latest service they could attend
    let streak = 0;
    const eligible = services.filter((s) => s.date >= m.joined);
    for (let i = eligible.length - 1; i >= 0; i--) {
      const here = pres?.has(eligible[i].id) ?? false;
      if (!here && excusedOn(m.id, eligible[i].date) && !o.countExcusedAsAbsent) continue;
      if (here) { if (streak < 0) break; streak++; } else { if (streak > 0) break; streak--; }
    }
    let lastAttended: string | null = null;
    for (const s of raw.services) if (pres?.has(s.id) && (!lastAttended || s.date > lastAttended)) lastAttended = s.date;
    let lateCount = 0, lateSum = 0;
    for (const s of services) {
      const late = pres?.get(s.id);
      if (late !== undefined && late > 0) { lateCount++; lateSum += late; }
    }
    const spark = services.slice(-8).map((s) => (s.date < m.joined ? null : pres?.has(s.id) ?? false));
    const excused = mls.some((ml) => defs.get(ml.labelId)?.excuses && activeOn(ml, o.today));
    const followup = mls.some((ml) => defs.get(ml.labelId)?.key === "followup" && activeOn(ml, o.today) && !(ml.snooze && ml.snooze >= o.today)) && !excused;
    let tier = tierOf(present, possible);
    if (excused && present === 0) tier = "excused";
    rows.push({
      id: m.id, name: fullName(m), first: m.first, family: m.family ?? "", gender: m.gender, deacon: m.deacon, status: m.status, joined: m.joined, dob: m.dob,
      present, possible, rate: possible > 0 ? present / possible : null, tier, streak, lastAttended, spark, lateCount, avgLate: lateCount ? Math.round(lateSum / lateCount) : 0,
      labels: mls.filter((ml) => !ml.removedAt && activeOn(ml, o.today) && defs.get(ml.labelId)?.active !== false).map((ml) => ({ ml, def: defs.get(ml.labelId)! })).filter((x) => x.def),
      excused, followup, hidden: false, prevRate: prev.possible > 0 ? prev.present / prev.possible : null, rank: 0,
    });
  }

  rows.sort(compareMostAttended);
  rows.forEach((r, i) => (r.rank = i + 1));

  // per service numbers (everyone who checked in, including guests from other churches)
  const memberById = new Map(raw.members.map((m) => [m.id, m]));
  const count = new Map<string, { n: number; late: number; men: number; women: number; deacons: number }>();
  for (const [mid, sid, late] of raw.present) {
    const c = count.get(sid) ?? { n: 0, late: 0, men: 0, women: 0, deacons: 0 };
    c.n++;
    if (late > 0) c.late++;
    const m = memberById.get(mid);
    if (m?.gender === "male") c.men++;
    if (m?.gender === "female") c.women++;
    if (m?.deacon) c.deacons++;
    count.set(sid, c);
  }
  const prevSorted = [...prevServices].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const perService = services.map((s, i) => {
    const c = count.get(s.id) ?? { n: 0, late: 0, men: 0, women: 0, deacons: 0 };
    const p = prevSorted[i];
    return { id: s.id, name: s.name, date: s.date, count: c.n, late: c.late, men: c.men, women: c.women, deacons: c.deacons, prevCount: p ? count.get(p.id)?.n ?? 0 : undefined };
  });
  const inPeriod = new Set(services.map((s) => s.id));
  const lateBuckets = [
    { label: "On time", count: 0 }, { label: "1–10 min", count: 0 }, { label: "11–20 min", count: 0 }, { label: "20+ min", count: 0 },
  ];
  for (const [, sid, late] of raw.present) {
    if (!inPeriod.has(sid)) continue;
    lateBuckets[late <= 0 ? 0 : late <= 10 ? 1 : late <= 20 ? 2 : 3].count++;
  }
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const avgPerService = perService.length ? sum(perService.map((p) => p.count)) / perService.length : 0;
  const prevCounts = prevServices.map((s) => count.get(s.id)?.n ?? 0);
  const prevAvgPerService = prevServices.length ? sum(prevCounts) / prevServices.length : null;

  const possibleAll = sum(rows.map((r) => r.possible));
  const presentAll = sum(rows.map((r) => r.present));
  const prevRates = rows.map((r) => r.prevRate).filter((x): x is number => x !== null);
  const tiers = { faithful: 0, regular: 0, occasional: 0, rarely: 0, absent: 0, excused: 0, nodata: 0 } as Record<Tier, number>;
  rows.forEach((r) => tiers[r.tier]++);
  const lateCount = sum(perService.map((p) => p.late));
  const total = sum(perService.map((p) => p.count));

  const welcomeBack = rows.filter((r) => r.labels.some((l) => l.def.key === "returned"));
  const newcomers = rows.filter((r) => r.joined >= o.from || r.labels.some((l) => l.def.key === "new_member" || l.def.key === "visitor"));
  const week = Array.from({ length: 7 }, (_, i) => addDays(o.today, i).slice(5));
  const birthdays = rows.filter((r) => r.dob && week.includes(r.dob.slice(5)));

  return {
    services, rows, hiddenCount, perService,
    totals: {
      avgPerService, prevAvgPerService,
      rate: possibleAll > 0 ? presentAll / possibleAll : null,
      prevRate: prevRates.length ? sum(prevRates) / prevRates.length : null,
      attendedAtLeastOnce: rows.filter((r) => r.present > 0).length, members: rows.length,
      tiers, faithful: tiers.faithful, followup: rows.filter((r) => r.followup).length, excused: tiers.excused,
      lateCount, onTimeCount: Math.max(0, total - lateCount),
    },
    lateBuckets, welcomeBack, newcomers, birthdays,
  };
}

// ---------- sorting ----------
const rateOf = (r: Row) => (r.rate === null ? -1 : r.rate);
export function compareMostAttended(a: Row, b: Row) {
  return (
    rateOf(b) - rateOf(a) ||
    b.present - a.present ||
    (b.lastAttended ?? "").localeCompare(a.lastAttended ?? "") ||
    a.name.localeCompare(b.name)
  );
}

export type SortKey = "most" | "least" | "absent" | "late" | "name" | "recent";
export const SORTS: Record<SortKey, (a: Row, b: Row) => number> = {
  most: compareMostAttended,
  least: (a, b) => compareMostAttended(b, a),
  absent: (a, b) => a.streak - b.streak || compareMostAttended(b, a),
  late: (a, b) => b.lateCount - a.lateCount || compareMostAttended(a, b),
  name: (a, b) => a.name.localeCompare(b.name),
  recent: (a, b) => b.joined.localeCompare(a.joined) || a.name.localeCompare(b.name),
};

// ---------- text ----------
export const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);

export function lastSeenText(last: string | null, today: string, joined: string) {
  if (!last) return joined >= addDays(today, -1) ? "Just joined" : "Not in this window";
  const d = daysBetween(last, today);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 14) return `${d} days ago`;
  return `${Math.floor(d / 7)} weeks ago`;
}

export function trend(now: number | null, before: number | null): { dir: "up" | "down" | "flat" | "none"; pct: number } {
  if (now === null || before === null || before === 0) return { dir: "none", pct: 0 };
  const p = Math.round(((now - before) / before) * 100);
  return { dir: p > 0 ? "up" : p < 0 ? "down" : "flat", pct: Math.abs(p) };
}

export function summaryText(s: Sheet, periodLabel: string, serviceName?: string) {
  const t = s.totals;
  const weeks = periodLabel.toLowerCase();
  const kind = serviceName ?? "service";
  const parts: string[] = [];
  if (t.members === 0) return "No members to report on yet.";
  parts.push(`In ${weeks === "custom range" ? "this period" : weeks.startsWith("last") || weeks.startsWith("this") ? `the ${weeks}` : weeks}, ${t.attendedAtLeastOnce} of ${t.members} members attended at least once (${pct(t.members ? t.attendedAtLeastOnce / t.members : null)}).`);
  if (s.perService.length) parts.push(`Average ${serviceName ? `${kind} ` : ""}attendance is ${Math.round(t.avgPerService)} ${Math.round(t.avgPerService) === 1 ? "person" : "people"}.`);
  parts.push(t.followup === 0 ? "Nobody needs follow-up right now." : `${t.followup} ${t.followup === 1 ? "person needs" : "people need"} follow-up.`);
  const tr = trend(t.avgPerService, t.prevAvgPerService);
  if (tr.dir === "up" || tr.dir === "down") parts.push(`Attendance is ${tr.dir} ${tr.pct}% from the previous period.`);
  return parts.join(" ");
}
