import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { getSession, hasSupabase, isAdminRole } from "@/lib/session";

// Admin area: signed in, approved, and an admin. Regular users go to their own pages.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (hasSupabase) {
    const { user, profile } = await getSession();
    if (!user) redirect("/login");
    if (!profile?.approved) redirect("/pending");
    if (!isAdminRole(profile.role)) redirect("/check-in");
  }
  return <Shell>{children}</Shell>;
}
