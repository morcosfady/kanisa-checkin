import AdminAccess, { type AdminRow } from "@/components/AdminAccess";
import ApprovalList from "@/components/ApprovalList";
import { Badge } from "@/components/ui";
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

  if (hasSupabase) {
    const { db, user } = await getSession();
    const [{ data: pending }, { data: adm }, { data: inv }] = await Promise.all([
      db.from("profiles").select("id, full_name, email, created_at").eq("approved", false).is("declined_at", null).order("created_at"),
      db.from("profiles").select("id, full_name, email").eq("role", "super_admin").eq("approved", true).order("created_at"),
      db.from("admin_invites").select("email").order("created_at"),
    ]);
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
      <AdminAccess admins={admins} invites={invites} />
    </div>
  );
}
