import MembersView from "@/components/members/MembersView";
import { demoMembers } from "@/lib/demo";
import { loadAdminChurch } from "@/lib/kinds";
import { fromDemo, loadMembers } from "@/lib/members";
import { getSession } from "@/lib/session";
import { demoChurches, demoCities } from "@/lib/places";
import { hasSupabase } from "@/lib/supabase/env";

export default async function Members() {
  if (!hasSupabase) {
    return <MembersView initial={demoMembers.map(fromDemo)} cities={demoCities} churches={demoChurches} />;
  }
  const { db, user } = await getSession();
  const { church } = await loadAdminChurch(db, user!.id);
  const { members, cities, churches } = await loadMembers(db, church?.id ?? null);
  return <MembersView initial={members} cities={cities} churches={churches} church={church} />;
}
