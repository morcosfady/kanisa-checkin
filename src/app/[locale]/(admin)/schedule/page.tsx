import ScheduleView, { type Template } from "@/components/schedule/ScheduleView";
import { getSession, hasSupabase } from "@/lib/session";

export default async function Schedule() {
  let items: Template[] = [{ id: "demo", name: "Divine Liturgy", type: "mass", weekday: 0, start: "08:00:00", end: "12:00:00", active: true }];
  if (hasSupabase) {
    const { db } = await getSession();
    const { data } = await db.from("service_templates").select("id, name_en, type, weekday, start_time, end_time, active").order("weekday").order("start_time");
    items = (data ?? []).map((t) => ({ id: t.id, name: t.name_en, type: t.type, weekday: t.weekday, start: t.start_time, end: t.end_time, active: t.active }));
  }
  return <ScheduleView initial={items} />;
}
