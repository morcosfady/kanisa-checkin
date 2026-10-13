import MembersView from "@/components/members/MembersView";
import { demoMembers } from "@/lib/demo";
import { fromDemo, loadMembers } from "@/lib/members";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Members() {
  if (!hasSupabase) {
    const families = [...new Set(demoMembers.map((m) => m.family))].map((f) => ({ id: f, name: f }));
    return <MembersView initial={demoMembers.map(fromDemo)} families={families} />;
  }
  const { members, families } = await loadMembers(await supabaseServer());
  return <MembersView initial={members} families={families} />;
}
