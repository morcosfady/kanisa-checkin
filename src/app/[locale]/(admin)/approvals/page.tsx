import { getTranslations } from "next-intl/server";
import ApprovalList from "@/components/ApprovalList";
import { supabaseServer } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

export default async function Approvals() {
  const t = await getTranslations("approvals");
  let rows: { id: string; full_name: string; email: string | null; created_at: string }[] = [];
  if (hasSupabase) {
    const db = await supabaseServer();
    const { data } = await db.from("profiles").select("id, full_name, email, created_at").eq("approved", false).is("declined_at", null).order("created_at");
    rows = data ?? [];
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-coptic">{t("title")}</h1>
      <ApprovalList initial={rows} />
    </div>
  );
}
