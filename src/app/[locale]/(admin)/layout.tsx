import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

// Signed-in users who are not approved yet only see the waiting page
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (hasSupabase) {
    const db = await supabaseServer();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) redirect("/login");
    const { data: profile } = await db.from("profiles").select("approved").eq("id", auth.user.id).maybeSingle();
    if (!profile?.approved) redirect("/pending");
  }
  return <Shell>{children}</Shell>;
}
