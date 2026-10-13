import ApprovalList from "@/components/ApprovalList";
import { Badge } from "@/components/ui";
import { supabaseServer } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

type Row = { id: string; full_name: string; email: string | null; created_at: string };

const DEMO: Row[] = [
  { id: "d1", full_name: "Sarah Demo", email: "sarah@example.com", created_at: "" },
  { id: "d2", full_name: "Peter Sample", email: "peter@example.com", created_at: "" },
];

export default async function Approvals() {
  let rows: Row[] = DEMO;
  if (hasSupabase) {
    const db = await supabaseServer();
    const { data } = await db.from("profiles").select("id, full_name, email, created_at").eq("approved", false).is("declined_at", null).order("created_at");
    rows = data ?? [];
  }
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl font-semibold text-heading">Approvals</h1>
        {rows.length > 0 && <Badge tone="red">{rows.length} pending</Badge>}
      </div>
      <ApprovalList initial={rows} />
    </div>
  );
}
