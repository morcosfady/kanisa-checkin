import MembersView from "@/components/members/MembersView";
import { demoMembers } from "@/lib/demo";
import { fromDemo, loadMembers } from "@/lib/members";
import { demoChurches, demoCities } from "@/lib/places";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Members() {
  if (!hasSupabase) {
    const families = [...new Set(demoMembers.map((m) => m.family))].map((f) => ({ id: f, name: f }));
    return <MembersView initial={demoMembers.map(fromDemo)} families={families} cities={demoCities} churches={demoChurches} />;
  }
  const { members, families, cities, churches } = await loadMembers(await supabaseServer());
  return <MembersView initial={members} families={families} cities={cities} churches={churches} />;
}
