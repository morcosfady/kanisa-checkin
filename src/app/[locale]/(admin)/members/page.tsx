import MembersView from "@/components/members/MembersView";
import { demoMembers } from "@/lib/demo";
import { fromDemo, loadMembers } from "@/lib/members";
import { demoChurches, demoCities } from "@/lib/places";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Members() {
  if (!hasSupabase) {
    return <MembersView initial={demoMembers.map(fromDemo)} cities={demoCities} churches={demoChurches} />;
  }
  const { members, cities, churches } = await loadMembers(await supabaseServer());
  return <MembersView initial={members} cities={cities} churches={churches} />;
}
