import AppHeader, { type HeaderUser } from "@/components/AppHeader";
import SacredBackground from "@/components/SacredBackground";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

async function currentUser(): Promise<HeaderUser> {
  if (!hasSupabase) return { name: "Demo Admin", role: "super_admin", pending: 2 }; // demo mode
  const db = await supabaseServer();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const { data: p } = await db.from("profiles").select("full_name, role, approved").eq("id", auth.user.id).maybeSingle();
  if (!p?.approved) return { name: p?.full_name ?? auth.user.email ?? "User", role: p?.role ?? "servant", pending: 0 };
  let pending = 0;
  if (p.role === "super_admin") {
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("approved", false).is("declined_at", null);
    pending = count ?? 0;
  }
  return { name: p.full_name, role: p.role, pending };
}

export default async function Shell({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <SacredBackground />
      <AppHeader user={user} />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
