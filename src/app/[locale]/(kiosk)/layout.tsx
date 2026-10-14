import { redirect } from "next/navigation";
import { getSession, hasSupabase, isAdminRole } from "@/lib/session";

// The kiosk tablet stays signed in as an admin/servant account. Everyone else is sent away.
export default async function KioskLayout({ children }: { children: React.ReactNode }) {
  if (hasSupabase) {
    const { user, profile } = await getSession();
    if (!user) redirect("/login?next=/kiosk");
    if (!profile?.approved || !isAdminRole(profile.role)) redirect("/home");
  }
  return children;
}
