import { hasSupabase } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export type Role = "super_admin" | "servant" | "member";
export type Profile = { full_name: string; role: Role; approved: boolean };

// Current signed-in user and profile (server side)
export async function getSession() {
  const db = await supabaseServer();
  const { data } = await db.auth.getUser();
  if (!data.user) return { db, user: null, profile: null as Profile | null };
  const { data: profile } = await db
    .from("profiles")
    .select("full_name, role, approved")
    .eq("id", data.user.id)
    .maybeSingle<Profile>();
  return { db, user: data.user, profile };
}

export const isAdminRole = (r?: Role | null) => r === "super_admin" || r === "servant";
export { hasSupabase };
