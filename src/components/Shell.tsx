import AppHeader, { type HeaderUser } from "@/components/AppHeader";
import SacredBackground from "@/components/SacredBackground";
import { Link } from "@/i18n/navigation";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";

async function currentUser(): Promise<HeaderUser> {
  if (!hasSupabase) {
    // demo mode: a cookie can switch the preview to the regular-user view
    const member = (await cookies()).get("demo_role")?.value === "member";
    return member ? { name: "Demo Member", role: "member", pending: 0, approved: true } : { name: "Demo Admin", role: "super_admin", pending: 2, approved: true };
  }
  const db = await supabaseServer();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const { data: p } = await db.from("profiles").select("full_name, role, approved").eq("id", auth.user.id).maybeSingle();
  if (!p?.approved) return { name: p?.full_name ?? auth.user.email ?? "User", role: p?.role ?? "member", pending: 0, approved: false };
  let pending = 0;
  if (p.role === "super_admin" || p.role === "admin") {
    const { data } = await db.rpc("list_admin_requests");
    pending = Array.isArray(data) ? data.length : 0;
  }
  return { name: p.full_name, role: p.role, pending, approved: true };
}

export default async function Shell({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <SacredBackground />
      <AppHeader user={user} />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="mx-auto max-w-[1280px] px-4 pb-6 text-center text-xs text-muted sm:px-6">
        <Link href="/privacy" className="underline-offset-4 hover:underline">Privacy</Link>
      </footer>
    </div>
  );
}
