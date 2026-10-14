import AttendanceView from "@/components/attendance/AttendanceView";
import ChurchGate from "@/components/ChurchGate";
import { addDays, resolvePeriod, type PeriodKey, type Raw } from "@/lib/attendance/calc";
import { buildDemoRaw } from "@/lib/attendance/demo";
import { chicagoToday, loadAttendance } from "@/lib/attendance/load";
import { loadAdminChurch } from "@/lib/kinds";
import { demoChurches, demoCities } from "@/lib/places";
import { getSession, hasSupabase } from "@/lib/session";
import "@/app/ledger.css";

const KEYS: PeriodKey[] = ["week", "4w", "8w", "12w", "month", "lastmonth", "year", "custom"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function Attendance({ searchParams }: { searchParams: Promise<{ p?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const today = chicagoToday();
  const key: PeriodKey = KEYS.includes(sp.p as PeriodKey) ? (sp.p as PeriodKey) : "8w";
  const custom = sp.from && sp.to && DATE.test(sp.from) && DATE.test(sp.to) ? { from: sp.from, to: sp.to } : undefined;
  const period = resolvePeriod(key, today, custom);

  if (!hasSupabase) {
    const raw = buildDemoRaw(today, 60, 24);
    return <AttendanceView raw={raw} period={period} periodKey={key} today={today} church={{ id: demoChurches[6].id, name: demoChurches[6].name }} demo canEdit />;
  }

  const { db, user, profile } = await getSession();
  const { church } = await loadAdminChurch(db, user!.id);
  if (!church) {
    const [{ data: hs }, { data: cs }] = await Promise.all([db.from("churches").select("id, name, city_id").order("name"), db.from("cities").select("id, name").order("name")]);
    return <ChurchGate churches={hs ?? []} cities={cs ?? []} />;
  }
  await db.rpc("ensure_labels", { p_church: church.id });
  const raw: Raw = await loadAttendance(db, church.id, addDays(period.prevFrom, 0), period.to);
  return <AttendanceView raw={raw} period={period} periodKey={key} today={today} church={church} demo={false} canEdit={profile?.role === "admin" || profile?.role === "super_admin"} />;
}
