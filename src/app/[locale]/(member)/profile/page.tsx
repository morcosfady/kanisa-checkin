import MyFaceCard from "@/components/member/MyFaceCard";
import MyProfileForm from "@/components/member/MyProfileForm";
import RequestAdmin from "@/components/member/RequestAdmin";
import { loadProfileData } from "@/lib/profile-data";
import { getSession, hasSupabase, isAdminRole } from "@/lib/session";

export default async function Profile() {
  const { initial, existing, hasFace, cities, churches } = await loadProfileData();
  let pending: string | null = null;
  let canRequest = !hasSupabase;
  if (hasSupabase) {
    const { db, user, profile } = await getSession();
    canRequest = !isAdminRole(profile?.role);
    if (canRequest && user) {
      const { data } = await db.from("profiles").select("churches!profiles_admin_request_church_fkey(name)").eq("id", user.id).maybeSingle();
      pending = (data?.churches as unknown as { name: string } | null)?.name ?? null;
    }
  }
  return (
    <div className="space-y-6">
      <h1 className="text-center font-display text-3xl font-semibold text-heading">{existing ? "My profile" : "Create my profile"}</h1>
      <MyProfileForm initial={initial} existing={existing} cities={cities} churches={churches} />
      {existing && initial.consent && <MyFaceCard name={initial.firstName} enrolled={hasFace} />}
      {existing && canRequest && <RequestAdmin pending={pending} churches={churches} cities={cities} />}
    </div>
  );
}
