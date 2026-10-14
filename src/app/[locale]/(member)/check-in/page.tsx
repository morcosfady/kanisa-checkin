import CheckInCard from "@/components/member/CheckInCard";
import { fmtService } from "@/lib/checkin";
import { getSession, hasSupabase } from "@/lib/session";

export default async function CheckIn() {
  let firstName: string | null = "Friend";
  let service: { name: string; when: string } | null = { name: "Divine Liturgy", when: "Sunday · 8:00 AM" };
  let checkedInAt: string | null = null;

  if (hasSupabase) {
    const { db, user } = await getSession();
    const { data: me } = await db.from("members").select("id, first_name").eq("user_id", user!.id).maybeSingle();
    firstName = me?.first_name ?? null;
    const { data: svc } = await db
      .from("services")
      .select("id, name_en, date, start_time")
      .eq("is_active", true)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    service = svc ? { name: svc.name_en, when: fmtService(svc.date, svc.start_time) } : null;
    if (me && svc) {
      const { data: a } = await db.from("attendance").select("checked_in_at").eq("member_id", me.id).eq("service_id", svc.id).maybeSingle();
      checkedInAt = a?.checked_in_at ?? null;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-center font-display text-3xl font-semibold text-heading">Check in</h1>
      <CheckInCard firstName={firstName} service={service} checkedInAt={checkedInAt} />
    </div>
  );
}
