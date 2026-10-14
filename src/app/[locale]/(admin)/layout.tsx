import { redirect } from "next/navigation";
import ChurchBar, { SuperProvider } from "@/components/ChurchBar";
import Shell from "@/components/Shell";
import { loadAdminChurch } from "@/lib/kinds";
import { demoChurches, demoCities, type ChurchRow, type CityRow } from "@/lib/places";
import { getSession, hasSupabase, isAdminRole } from "@/lib/session";

// Admin area: signed in and an admin. Regular users go to their own pages.
// The super admin also gets a bar to switch which church they are managing.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let isSuper = !hasSupabase;
  let current = demoChurches[6].name;
  let churches: ChurchRow[] = demoChurches;
  let cities: CityRow[] = demoCities;
  if (hasSupabase) {
    const { db, user, profile } = await getSession();
    if (!user) redirect("/login");
    if (!isAdminRole(profile?.role)) redirect("/check-in");
    isSuper = profile?.role === "super_admin";
    if (isSuper) {
      current = (await loadAdminChurch(db, user.id)).church?.name ?? "";
      const [{ data: hs }, { data: cs }] = await Promise.all([
        db.from("churches").select("id, name, city_id").order("name"),
        db.from("cities").select("id, name").order("name"),
      ]);
      churches = hs ?? [];
      cities = cs ?? [];
    }
  }
  return (
    <Shell>
      <SuperProvider isSuper={isSuper}>
        {isSuper && <ChurchBar current={current} churches={churches} cities={cities} />}
        {children}
      </SuperProvider>
    </Shell>
  );
}
