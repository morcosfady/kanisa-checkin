import { redirect } from "next/navigation";
import MyProfileForm from "@/components/member/MyProfileForm";
import Shell from "@/components/Shell";
import { loadProfileData } from "@/lib/profile-data";
import { getSession, hasSupabase } from "@/lib/session";

// Step 2 of "Create new profile": the full profile form, shown right after the account is made.
// Lives outside the approved-only groups so people waiting for approval can fill it in.
export default async function Welcome() {
  if (hasSupabase) {
    const { user } = await getSession();
    if (!user) redirect("/login");
  }
  const { initial, existing, cities, churches } = await loadProfileData();
  if (hasSupabase && existing) {
    const { profile } = await getSession();
    redirect(profile?.approved ? "/home" : "/pending");
  }
  return (
    <Shell>
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest text-goldtext">Step 2 of 2</p>
          <h1 className="font-display text-3xl font-semibold text-heading">Tell us about you</h1>
          <p className="mt-1 text-muted">This creates your profile. Abouna will approve it, then you can check in.</p>
        </div>
        <MyProfileForm initial={initial} existing={false} cities={cities} churches={churches} onboarding />
      </div>
    </Shell>
  );
}
