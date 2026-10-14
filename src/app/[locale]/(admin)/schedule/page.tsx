import ScheduleView, { type Template } from "@/components/schedule/ScheduleView";
import { demoKinds, loadAdminChurch, type AdminChurch, type Kind } from "@/lib/kinds";
import { demoChurches, demoCities, type ChurchRow, type CityRow } from "@/lib/places";
import { getSession, hasSupabase } from "@/lib/session";

export default async function Schedule() {
  let items: Template[] = [{ id: "demo", name: "Divine Liturgy", type: "mass", weekday: 0, start: "08:00:00", end: "12:00:00", active: true }];
  let churches: ChurchRow[] = demoChurches;
  let cities: CityRow[] = demoCities;
  let church: AdminChurch = { id: demoChurches[6].id, name: demoChurches[6].name };
  let kinds: Kind[] = demoKinds;

  if (hasSupabase) {
    const { db, user } = await getSession();
    const mine = await loadAdminChurch(db, user!.id);
    church = mine.church;
    kinds = mine.kinds;
    const [{ data }, { data: hs }, { data: cs }] = await Promise.all([
      db.from("service_templates").select("id, name_en, type, weekday, start_time, end_time, active").order("weekday").order("start_time"),
      db.from("churches").select("id, name, city_id").order("name"),
      db.from("cities").select("id, name").order("name"),
    ]);
    churches = hs ?? [];
    cities = cs ?? [];
    items = (data ?? []).map((t) => ({ id: t.id, name: t.name_en, type: t.type, weekday: t.weekday, start: t.start_time, end: t.end_time, active: t.active }));
  }
  return <ScheduleView initial={items} kinds={kinds} church={church} churches={churches} cities={cities} />;
}
