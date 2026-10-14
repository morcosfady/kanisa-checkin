import { describe, expect, it } from "vitest";
import {
  activeOn, addDays, computeSheet, lastSeenText, resolvePeriod, summaryText, tierOf, trend,
  type LabelDef, type MemLabel, type Raw,
} from "../../src/lib/attendance/calc";

const TODAY = "2026-10-18"; // a Sunday
const label = (o: Partial<LabelDef> & { id: string }): LabelDef => ({
  key: null, name: o.id, nameAr: "", emoji: "", color: "#000", description: "", system: false, auto: false, excuses: false, hides: false, days: null, order: 0, active: true, ...o,
});
const FOLLOWUP = label({ id: "fu", key: "followup", system: true, auto: true });
const TRAVEL = label({ id: "tr", key: "traveling", excuses: true });
const MOVED = label({ id: "mv", key: "moved", hides: true });
const RETURNED = label({ id: "rt", key: "returned" });

// 8 Sundays, oldest first: Aug 30 ... Oct 18
const sundays = Array.from({ length: 8 }, (_, i) => addDays(TODAY, -7 * (7 - i)));
const services = sundays.map((d, i) => ({ id: `s${i}`, name: "Divine Liturgy", type: "mass", date: d, start: "08:00" }));
const mem = (id: string, extra: object = {}) => ({ id, first: id.toUpperCase(), last: "Test", family: "Fam", gender: "male", deacon: false, status: "active", joined: "2025-01-01", dob: null, ...extra });
const present = (id: string, idx: number[], late = 0): [string, string, number][] => idx.map((i) => [id, `s${i}`, late]);
const ml = (o: Partial<MemLabel> & { memberId: string; labelId: string }): MemLabel => ({ id: Math.random().toString(), addedAt: "2026-01-01T00:00:00Z", by: null, note: null, until: null, snooze: null, removedAt: null, ...o });

function raw(members: ReturnType<typeof mem>[], pres: [string, string, number][], memberLabels: MemLabel[] = [], labels = [FOLLOWUP, TRAVEL, MOVED, RETURNED]): Raw {
  return { services, members, present: pres, labels, memberLabels, followupMisses: 3 };
}
const opts = { from: sundays[0], to: TODAY, today: TODAY };

describe("tiers", () => {
  it("uses the agreed boundaries", () => {
    expect(tierOf(8, 8)).toBe("faithful");
    expect(tierOf(9, 10)).toBe("faithful"); // exactly 90%
    expect(tierOf(7, 8)).toBe("regular"); // 87.5%
    expect(tierOf(7, 10)).toBe("regular"); // exactly 70%
    expect(tierOf(4, 8)).toBe("occasional"); // 50%
    expect(tierOf(4, 10)).toBe("occasional"); // exactly 40%
    expect(tierOf(3, 10)).toBe("rarely");
    expect(tierOf(1, 8)).toBe("rarely");
    expect(tierOf(0, 8)).toBe("absent");
    expect(tierOf(0, 0)).toBe("nodata");
  });
});

describe("rate, streaks and last attended", () => {
  const s = computeSheet(
    raw([mem("a"), mem("b"), mem("c"), mem("d")], [
      ...present("a", [0, 1, 2, 3, 4, 5, 6, 7]),
      ...present("b", [0, 1, 2, 3, 4]), // missed the last 3
      ...present("c", [7]),
    ]),
    opts,
  );
  const by = (id: string) => s.rows.find((r) => r.id === id)!;
  it("computes rate and tier", () => {
    expect(by("a").rate).toBe(1);
    expect(by("a").tier).toBe("faithful");
    expect(by("b").present).toBe(5);
    expect(by("b").tier).toBe("occasional");
    expect(by("d").tier).toBe("absent");
  });
  it("counts present and absent streaks", () => {
    expect(by("a").streak).toBe(8);
    expect(by("b").streak).toBe(-3);
    expect(by("c").streak).toBe(1);
  });
  it("finds the last attended date", () => {
    expect(by("b").lastAttended).toBe(sundays[4]);
    expect(by("d").lastAttended).toBeNull();
  });
  it("ranks most attended first, then by name", () => {
    expect(s.rows.map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
    expect(s.rows[0].rank).toBe(1);
  });
});

describe("join date", () => {
  it("only counts services on or after the member joined", () => {
    const s = computeSheet(raw([mem("n", { joined: sundays[6] })], present("n", [6, 7])), opts);
    expect(s.rows[0].possible).toBe(2);
    expect(s.rows[0].tier).toBe("faithful");
  });
});

describe("excused labels", () => {
  const traveling = ml({ memberId: "t", labelId: "tr", addedAt: sundays[3] + "T00:00:00Z", until: null });
  it("remove excused services from the possible count", () => {
    const s = computeSheet(raw([mem("t")], present("t", [0, 1, 2]), [traveling]), opts);
    expect(s.rows[0].possible).toBe(3); // services 0,1,2 only; 3..7 are excused
    expect(s.rows[0].tier).toBe("faithful");
    expect(s.rows[0].excused).toBe(true);
  });
  it("can count excused as absent when asked", () => {
    const s = computeSheet(raw([mem("t")], present("t", [0, 1, 2]), [traveling]), { ...opts, countExcusedAsAbsent: true });
    expect(s.rows[0].possible).toBe(8);
  });
  it("excused members never need follow-up", () => {
    const fu = ml({ memberId: "t", labelId: "fu" });
    const s = computeSheet(raw([mem("t")], [], [traveling, fu]), opts);
    expect(s.rows[0].followup).toBe(false);
    expect(s.rows[0].tier).toBe("excused");
  });
  it("an end date stops the excuse", () => {
    const ended = ml({ memberId: "t", labelId: "tr", addedAt: sundays[0] + "T00:00:00Z", until: sundays[3] });
    expect(activeOn(ended, sundays[3])).toBe(true);
    expect(activeOn(ended, sundays[4])).toBe(false);
    const s = computeSheet(raw([mem("t")], present("t", [4, 5, 6, 7]), [ended]), opts);
    expect(s.rows[0].possible).toBe(4);
  });
});

describe("follow-up and hidden members", () => {
  it("shows follow-up unless snoozed", () => {
    const fu = ml({ memberId: "a", labelId: "fu" });
    expect(computeSheet(raw([mem("a")], [], [fu]), opts).rows[0].followup).toBe(true);
    const snoozed = { ...fu, snooze: addDays(TODAY, 7) };
    expect(computeSheet(raw([mem("a")], [], [snoozed]), opts).rows[0].followup).toBe(false);
    const expired = { ...fu, snooze: addDays(TODAY, -1) };
    expect(computeSheet(raw([mem("a")], [], [expired]), opts).rows[0].followup).toBe(true);
  });
  it("a removed follow-up label is gone", () => {
    const fu = ml({ memberId: "a", labelId: "fu", removedAt: sundays[2] + "T10:00:00Z" });
    expect(computeSheet(raw([mem("a")], [], [fu]), opts).rows[0].followup).toBe(false);
  });
  it("moved-away members are left out of the stats", () => {
    const moved = ml({ memberId: "m", labelId: "mv" });
    const s = computeSheet(raw([mem("a"), mem("m")], [], [moved]), opts);
    expect(s.rows.map((r) => r.id)).toEqual(["a"]);
    expect(s.hiddenCount).toBe(1);
  });
  it("lists returned members under welcome back", () => {
    const back = ml({ memberId: "a", labelId: "rt" });
    expect(computeSheet(raw([mem("a")], present("a", [7]), [back]), opts).welcomeBack.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("previous period and totals", () => {
  it("builds the window right before the selected one", () => {
    const p = resolvePeriod("8w", TODAY);
    expect(p.to).toBe(TODAY);
    expect(p.prevTo).toBe(addDays(p.from, -1));
    expect(p.prevFrom).toBe(addDays(p.from, -56));
  });
  it("compares average attendance with the previous window", () => {
    const old = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: "Divine Liturgy", type: "mass", date: addDays(sundays[0], -7 * (8 - i)), start: "08:00" }));
    const r: Raw = {
      services: [...old, ...services], members: [mem("a"), mem("b")],
      present: [
        ...old.map((s) => ["a", s.id, 0] as [string, string, number]), // previous: 1 person per service
        ...present("a", [0, 1, 2, 3, 4, 5, 6, 7]), ...present("b", [0, 1, 2, 3, 4, 5, 6, 7]), // now: 2 per service
      ],
      labels: [], memberLabels: [], followupMisses: 3,
    };
    const s = computeSheet(r, { from: sundays[0], to: TODAY, today: TODAY });
    expect(s.totals.avgPerService).toBe(2);
    expect(s.totals.prevAvgPerService).toBe(1);
    expect(trend(s.totals.avgPerService, s.totals.prevAvgPerService)).toEqual({ dir: "up", pct: 100 });
  });
  it("filters by service name", () => {
    const r = raw([mem("a")], present("a", [0]));
    r.services = [...services.slice(0, 2), { ...services[2], name: "Vespers" }];
    const s = computeSheet(r, { ...opts, serviceName: "Vespers" });
    expect(s.services).toHaveLength(1);
    expect(s.rows[0].possible).toBe(1);
  });
  it("counts late arrivals", () => {
    const s = computeSheet(raw([mem("a")], [["a", "s0", 12], ["a", "s1", 0]]), opts);
    expect(s.rows[0].lateCount).toBe(1);
    expect(s.rows[0].avgLate).toBe(12);
    expect(s.totals.lateCount).toBe(1);
  });
});

describe("text", () => {
  it("builds a plain summary", () => {
    const s = computeSheet(raw([mem("a"), mem("b")], present("a", [0, 1])), opts);
    const t = summaryText(s, "Last 8 weeks");
    expect(t).toContain("1 of 2 members attended at least once");
    expect(t).toContain("last 8 weeks");
  });
  it("describes last attended in words", () => {
    expect(lastSeenText(TODAY, TODAY, "2025-01-01")).toBe("Today");
    expect(lastSeenText(addDays(TODAY, -3), TODAY, "2025-01-01")).toBe("3 days ago");
    expect(lastSeenText(addDays(TODAY, -21), TODAY, "2025-01-01")).toBe("3 weeks ago");
    expect(lastSeenText(null, TODAY, "2025-01-01")).toBe("Not in this window");
  });
});

describe("speed", () => {
  it("works out 500 members x 52 services in well under a second", async () => {
    const { buildDemoRaw } = await import("../../src/lib/attendance/demo");
    const raw = buildDemoRaw(TODAY, 500, 52);
    const t0 = performance.now();
    const s = computeSheet(raw, { from: addDays(TODAY, -364), to: TODAY, today: TODAY });
    const ms = performance.now() - t0;
    console.log(`computeSheet: ${raw.members.length} members, ${raw.services.length} services, ${raw.present.length} check-ins -> ${ms.toFixed(0)} ms`);
    expect(s.rows.length).toBeGreaterThan(400);
    expect(ms).toBeLessThan(1000);
  });
});
