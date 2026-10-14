import AdminAccess, { type AdminRow } from "@/components/AdminAccess";
import ApprovalList from "@/components/ApprovalList";
import { Badge } from "@/components/ui";
import { loadAdminChurch, type AdminChurch } from "@/lib/kinds";
import { demoChurches, demoCities, type ChurchRow, type CityRow } from "@/lib/places";
import { getSession, hasSupabase } from "@/lib/session";

type Row = { id: string; full_name: string; email: string | null; created_at: string };

const DEMO: Row[] = [
  { id: "d1", full_name: "Sarah Demo", email: "sarah@example.com", created_at: "" },
  { id: "d2", full_name: "Peter Sample", email: "peter@example.com", created_at: "" },
];

export default async function Approvals() {
  let rows: Row[] = DEMO;
  let admins: AdminRow[] = [{ id: "me", name: "Demo Admin", email: "admin@example.com", isYou: true }];
  let invites: string[] = [];
  let church: AdminChurch = { id: demoChurches[6].id, name: demoChurches[6].name };
  let churches: ChurchRow[] = demoChurches;
  let cities: CityRow[] = demoCities;

  if (hasSupabase) {
    const { db, user } = await getSession();
    church = (await loadAdminChurch(db, user!.id)).church;
    const [{ data: pending }, { data: adm }, { data: inv }, { data: hs }, { data: cs }] = await Promise.all([
      db.from("profiles").select("id, full_name, email, created_at").eq("approved", false).is("declined_at", null).order("created_at"),
      db.from("profiles").select("id, full_name, email").eq("role", "super_admin").eq("approved", true).eq("church_id", church?.id ?? "00000000-0000-0000-0000-000000000000").order("created_at"),
      db.from("admin_invites").select("email").eq("church_id", church?.id ?? "00000000-0000-0000-0000-000000000000").order("created_at"),
      db.from("churches").select("id, name, city_id").order("name"),
      db.from("cities").select("id, name").order("name"),
    ]);
    churches = hs ?? [];
    cities = cs ?? [];
    rows = pending ?? [];
    admins = (adm ?? []).map((a) => ({ id: a.id, name: a.full_name, email: a.email ?? "", isYou: a.id === user?.id }));
    invites = (inv ?? []).map((i) => i.email);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold text-heading">Approvals</h1>
          {rows.length > 0 && <Badge tone="red">{rows.length} pending</Badge>}
        </div>
        <ApprovalList initial={rows} />
      </div>
      <AdminAccess admins={admins} invites={invites} church={church} churches={churches} cities={cities} />
    </div>
  );
}
