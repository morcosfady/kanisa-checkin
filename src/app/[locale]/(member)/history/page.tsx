import { CalendarCheck } from "lucide-react";
import { Badge, card } from "@/components/ui";
import { fmtDate, fmtTime, METHOD_LABEL } from "@/lib/checkin";
import { Link } from "@/i18n/navigation";
import { getSession, hasSupabase } from "@/lib/session";

type Row = { checked_in_at: string; method: string; late_minutes: number; service: string };

const DEMO: Row[] = [
  { checked_in_at: "2026-10-11T13:02:00Z", method: "face", late_minutes: 0, service: "Divine Liturgy" },
  { checked_in_at: "2026-10-04T13:09:00Z", method: "self", late_minutes: 0, service: "Divine Liturgy" },
  { checked_in_at: "2026-09-27T13:21:00Z", method: "qr", late_minutes: 11, service: "Divine Liturgy" },
  { checked_in_at: "2026-09-24T23:05:00Z", method: "self", late_minutes: 0, service: "Bible Study" },
  { checked_in_at: "2026-09-20T12:58:00Z", method: "face", late_minutes: 0, service: "Divine Liturgy" },
  { checked_in_at: "2026-09-13T13:06:00Z", method: "face", late_minutes: 0, service: "Divine Liturgy" },
  { checked_in_at: "2026-09-10T23:01:00Z", method: "qr", late_minutes: 0, service: "Bible Study" },
  { checked_in_at: "2026-09-06T13:18:00Z", method: "manual", late_minutes: 8, service: "Divine Liturgy" },
];

export default async function History() {
  let rows: Row[] = DEMO;
  let hasProfile = true;

  if (hasSupabase) {
    const { db, user } = await getSession();
    const { data: me } = await db.from("members").select("id").eq("user_id", user!.id).maybeSingle();
    hasProfile = Boolean(me);
    rows = [];
    if (me) {
      // only my own rows, even if I am an admin
      const { data } = await db
        .from("attendance")
        .select("checked_in_at, method, late_minutes, services(name_en)")
        .eq("member_id", me.id)
        .order("checked_in_at", { ascending: false })
        .limit(200);
      rows = (data ?? []).map((a) => ({
        checked_in_at: a.checked_in_at,
        method: a.method,
        late_minutes: a.late_minutes,
        service: (a.services as unknown as { name_en: string } | null)?.name_en ?? "Service",
      }));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-center font-display text-3xl font-semibold text-heading">My history</h1>
      {!hasProfile ? (
        <div className={`${card} space-y-2 p-8 text-center`}>
          <p className="font-display text-xl font-semibold text-heading">No profile yet</p>
          <Link href="/profile" className="text-heading underline underline-offset-4">Create my profile</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className={`${card} p-4 text-center`}>
              <div className="font-display text-3xl font-semibold text-heading num">{rows.length}</div>
              <div className="text-sm text-muted">Times checked in</div>
            </div>
            <div className={`${card} p-4 text-center`}>
              <div className="font-display text-xl font-semibold text-heading">{rows[0] ? fmtDate(rows[0].checked_in_at) : "—"}</div>
              <div className="text-sm text-muted">Last visit</div>
            </div>
          </div>
          {rows.length === 0 ? (
            <div className={`${card} grid place-items-center gap-2 p-10 text-center`}>
              <CalendarCheck size={40} strokeWidth={1.5} className="text-goldtext" />
              <p className="text-muted">No check-ins yet. Your visits will appear here.</p>
            </div>
          ) : (
            <ul className={`${card} divide-y divide-line`}>
              {rows.map((r, i) => (
                <li key={i} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="me-auto">
                    <div className="font-medium">{r.service}</div>
                    <div className="text-sm text-muted">{fmtDate(r.checked_in_at)}</div>
                  </div>
                  <Badge tone="gray">{METHOD_LABEL[r.method] ?? r.method}</Badge>
                  <span className="num w-20 text-end text-sm">{fmtTime(r.checked_in_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
