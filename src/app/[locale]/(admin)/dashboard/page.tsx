import TodayView, { type Arrival, type TodayMember, type TodayService } from "@/components/today/TodayView";
import { demoArrivals, demoMembers, demoService, toMinutes } from "@/lib/demo";
import { fmtService } from "@/lib/checkin";
import { demoChurches, demoCities } from "@/lib/places";
import { getSession, hasSupabase } from "@/lib/session";

// minutes since midnight, Chicago time
function chicagoMinutes(iso: string) {
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hour12: false, timeZone: "America/Chicago" }).formatToParts(new Date(iso));
  return (Number(parts.find((p) => p.type === "hour")!.value) % 24) * 60 + Number(parts.find((p) => p.type === "minute")!.value);
}

export default async function Dashboard() {
  if (!hasSupabase) {
    const service: TodayService = { id: null, name: demoService.nameEn, whenLabel: "Sunday, October 11 · starts 8:00 AM", startMin: 8 * 60, graceMin: 10 };
    const members: TodayMember[] = demoMembers.map((m) => ({ id: m.id, name: m.name, gender: m.gender, deacon: m.deacon, status: m.status }));
    const arrivals: Arrival[] = demoArrivals.map((a) => ({ memberId: a.memberId, min: toMinutes(a.time), method: a.method, late: toMinutes(a.time) > 8 * 60 + 10 }));
    return <TodayView demo service={service} initialArrivals={arrivals} members={members} churches={demoChurches} cities={demoCities} />;
  }

  const { db } = await getSession();
  const [{ data: opened }, { data: ms }, { data: settings }, { data: hs }, { data: cs }] = await Promise.all([
    db.rpc("open_service"),
    db.from("members").select("id, first_name, last_name, gender, is_deacon, status").order("first_name"),
    db.from("settings").select("late_after_minutes").limit(1).maybeSingle(),
    db.from("churches").select("id, name, city_id").order("name"),
    db.from("cities").select("id, name").order("name"),
  ]);
  const churches = hs ?? [];
  const cities = cs ?? [];

  const svc = opened && opened.id ? opened : null;
  const members: TodayMember[] = (ms ?? []).map((m) => ({
    id: m.id, name: `${m.first_name} ${m.last_name}`.trim(), gender: m.gender ?? "male", deacon: m.is_deacon, status: m.status,
  }));
  if (!svc) return <TodayView demo={false} service={null} initialArrivals={[]} members={members} churches={churches} cities={cities} />;

  const { data: att } = await db.from("attendance").select("member_id, checked_in_at, method, late_minutes").eq("service_id", svc.id);
  const [h, mm] = String(svc.start_time).split(":").map(Number);
  const service: TodayService = {
    id: svc.id, name: svc.name_en, whenLabel: fmtService(svc.date, svc.start_time, svc.end_time), startMin: h * 60 + mm, graceMin: settings?.late_after_minutes ?? 10, code: svc.code ?? null,
  };
  const arrivals: Arrival[] = (att ?? []).map((a) => ({
    memberId: a.member_id, min: chicagoMinutes(a.checked_in_at), method: a.method, late: a.late_minutes > 0,
  }));
  return <TodayView demo={false} service={service} initialArrivals={arrivals} members={members} churches={churches} cities={cities} />;
}
