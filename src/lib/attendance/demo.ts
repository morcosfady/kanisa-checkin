import { addDays, type LabelDef, type MemLabel, type Raw, type Svc } from "./calc";

// Fake people only. A seeded random generator so every run gives the same picture.
const FIRST_M = ["Mina", "Mark", "Peter", "Samuel", "Antonios", "Pavly", "Marcos", "Kyrillos", "Youssef", "Abanoub", "Bishoy", "Shenouda", "Karas", "David", "Andrew", "George", "Fady", "Ramy", "Moussa", "Daniel"];
const FIRST_F = ["Marina", "Mary", "Sandra", "Verena", "Mariam", "Christina", "Nermeen", "Hannah", "Rebecca", "Sara", "Monica", "Irene", "Demiana", "Martha", "Sophia", "Yostina", "Veronica", "Nancy", "Lydia", "Katrina"];
const LAST = ["Demo", "Sample", "Example", "Test", "Mock", "Fake", "Guirguis", "Tadros", "Habib", "Nashed", "Samaan", "Wassef"];

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Persona = "faithful" | "regular" | "occasional" | "rare" | "absent" | "returned" | "new";
const PERSONAS: [Persona, number][] = [["faithful", 0.22], ["regular", 0.3], ["occasional", 0.2], ["rare", 0.13], ["absent", 0.08], ["returned", 0.04], ["new", 0.03]];
const PROB: Record<Persona, number> = { faithful: 0.97, regular: 0.8, occasional: 0.5, rare: 0.18, absent: 0, returned: 0.9, new: 0.85 };

export function buildLabels(): LabelDef[] {
  const L = (key: string, name: string, emoji: string, color: string, o: Partial<LabelDef> = {}): LabelDef => ({
    id: `L-${key}`, key, name, nameAr: "", emoji, color, description: "", system: false, auto: false, excuses: false, hides: false, days: null, order: 0, active: true, ...o,
  });
  return [
    L("followup", "Follow up needed", "🔔", "#C0392B", { system: true, auto: true }),
    L("called", "Called", "📞", "#2F7F86"), L("visited", "Visited", "🏠", "#2E7D4F"), L("prayer", "Needs prayer", "🙏", "#7B4FA0"),
    L("sick", "Sick / recovering", "🤒", "#B5546A", { excuses: true, days: 30 }), L("traveling", "Traveling", "✈️", "#3B82B6", { excuses: true }),
    L("college", "Away at college", "🎓", "#4F5BB5", { excuses: true }), L("ride", "Needs a ride", "🚗", "#C08A1E"),
    L("new_member", "New member", "🌱", "#2E7D4F", { system: true, auto: true, days: 56 }), L("visitor", "Visitor", "👋", "#B8892E"),
    L("returned", "Returned", "🎉", "#B8892E", { system: true, auto: true, days: 14 }), L("moved", "Moved away", "📦", "#8C93A3", { hides: true }),
    L("elsewhere", "Serving elsewhere", "⛪", "#8C93A3"), L("no_contact", "Do not contact", "🚫", "#4B5563"),
  ].map((l, i) => ({ ...l, order: i + 1 }));
}

// n members, `weeks` weeks of Liturgy (Sun), Vespers (Sat) and Bible Study (Wed) ending today
export function buildDemoRaw(today: string, n = 60, weeks = 12, seed = 7): Raw {
  const r = rng(seed);
  const labels = buildLabels();
  const services: Svc[] = [];
  for (let d = -weeks * 7; d <= 0; d++) {
    const date = addDays(today, d);
    const dow = new Date(date + "T00:00:00Z").getUTCDay();
    if (dow === 0) services.push({ id: `S-${date}-lit`, name: "Divine Liturgy", type: "mass", date, start: "08:00" });
    if (dow === 6) services.push({ id: `S-${date}-ves`, name: "Vespers", type: "vespers", date, start: "18:00" });
    if (dow === 3) services.push({ id: `S-${date}-bib`, name: "Bible Study", type: "bible_study", date, start: "19:00" });
  }
  const members = [];
  const present: [string, string, number][] = [];
  const memberLabels: MemLabel[] = [];
  const labelId = (k: string) => `L-${k}`;
  const give = (memberId: string, key: string, o: Partial<MemLabel> = {}) =>
    memberLabels.push({ id: `ML-${memberId}-${key}`, memberId, labelId: labelId(key), addedAt: addDays(today, -10) + "T12:00:00Z", by: "Fr. Demo", note: null, until: null, snooze: null, removedAt: null, ...o });

  const liturgies = services.filter((s) => s.name === "Divine Liturgy");
  for (let i = 0; i < n; i++) {
    const female = i % 2 === 1;
    const first = (female ? FIRST_F : FIRST_M)[Math.floor(i / 2) % 20];
    const last = LAST[Math.floor(r() * LAST.length)];
    let acc = 0, persona: Persona = "regular";
    const roll = r();
    for (const [p, w] of PERSONAS) { acc += w; if (roll <= acc) { persona = p; break; } }
    const id = `M${String(i + 1).padStart(3, "0")}`;
    const joined = persona === "new" ? addDays(today, -21) : addDays(today, -400);
    members.push({
      id, first, last, family: `${last} family ${1 + Math.floor(i / 3)}`, gender: female ? "female" : "male", deacon: !female && r() < 0.25, status: "active", joined,
      dob: r() < 0.9 ? `${1975 + Math.floor(r() * 35)}-${String(1 + Math.floor(r() * 12)).padStart(2, "0")}-${String(1 + Math.floor(r() * 28)).padStart(2, "0")}` : null,
    });
    const quietFrom = persona === "returned" ? liturgies.length - 4 : persona === "absent" ? 0 : 999; // returned: away for a while, back this week
    const awayUntil = persona === "returned" ? liturgies.length - 1 : 0;
    for (const s of services) {
      if (s.date < joined) continue;
      const li = liturgies.findIndex((x) => x.id === s.id);
      let p = PROB[persona] * (s.name === "Divine Liturgy" ? 1 : s.name === "Vespers" ? 0.85 : 0.8);
      if (persona === "returned") p = s.date >= liturgies[awayUntil].date ? 0.95 : s.date >= liturgies[quietFrom].date ? 0 : p;
      if (r() < p) {
        const late = r() < (persona === "regular" ? 0.35 : 0.12) ? 1 + Math.floor(r() * 25) : 0;
        present.push([id, s.id, late]);
      }
      void li;
    }
    if (persona === "absent") give(id, "followup", { addedAt: addDays(today, -14) + "T09:00:00Z" });
    if (persona === "returned") give(id, "returned", { until: addDays(today, 12), addedAt: addDays(today, -2) + "T09:00:00Z" });
    if (persona === "new") give(id, "new_member", { until: addDays(today, 35) });
    if (i === 7) give(id, "traveling", { until: addDays(today, 30), note: "Back in November" });
    if (i === 13) give(id, "sick", { until: addDays(today, 10) });
    if (i === 20) give(id, "prayer");
    if (i === 22) give(id, "called");
    if (i === 33) give(id, "ride");
  }
  return { services, members, present, labels, memberLabels, followupMisses: 3 };
}
