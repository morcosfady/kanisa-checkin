import AdminAccess, { type AdminRow, type InviteRow } from "@/components/AdminAccess";
import ApprovalList, { type AdminRequest } from "@/components/ApprovalList";
import { Badge } from "@/components/ui";
import { loadAdminChurch, type AdminChurch } from "@/lib/kinds";
import { demoChurches, demoCities, type ChurchRow, type CityRow } from "@/lib/places";
import { getSession, hasSupabase } from "@/lib/session";

const DEMO: AdminRequest[] = [
  { id: "d1", name: "Fr. Demo Priest", email: "priest@example.com", church: demoChurches[6].name },
];

// Approvals = admin requests only. Regular users never need approval.
export default async function Approvals() {
  let requests: AdminRequest[] = DEMO;
  let admins: AdminRow[] = [{ id: "me", name: "Demo Admin", email: "admin@example.com", church: demoChurches[6].name, isYou: true }];
  let invites: InviteRow[] = [];
  let church: AdminChurch = { id: demoChurches[6].id, name: demoChurches[6].name };
  let churches: ChurchRow[] = demoChurches;
  let cities: CityRow[] = demoCities;

  if (hasSupabase) {
    const { db, user } = await getSession();
    church = (await loadAdminChurch(db, user!.id)).church;
    const [{ data: req }, { data: adm }, { data: inv }, { data: hs }, { data: cs }] = await Promise.all([
      db.rpc("list_admin_requests"),
      db.rpc("list_admins"),
      db.rpc("list_admin_invites"),
      db.from("churches").select("id, name, city_id").order("name"),
      db.from("cities").select("id, name").order("name"),
    ]);
    churches = hs ?? [];
    cities = cs ?? [];
    requests = (req ?? []) as AdminRequest[];
    admins = ((adm ?? []) as { id: string; name: string; email: string; role: string; church: string | null }[]).map((a) => ({
      id: a.id, name: a.name, email: a.email ?? "", church: a.church ?? "No church yet", isYou: a.id === user?.id, isSuper: a.role === "super_admin",
    }));
    invites = ((inv ?? []) as { email: string; church: string | null }[]).map((i) => ({ email: i.email, church: i.church ?? "" }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold text-heading">Approvals</h1>
          {requests.length > 0 && <Badge tone="red">{requests.length} pending</Badge>}
        </div>
        <p className="text-sm text-muted">People who asked to be an admin. Regular users don’t need approval.</p>
        <ApprovalList initial={requests} />
      </div>
      <AdminAccess admins={admins} invites={invites} church={church} churches={churches} cities={cities} />
    </div>
  );
}
