import { redirect } from "next/navigation";
import MyProfileForm from "@/components/member/MyProfileForm";
import Shell from "@/components/Shell";
import { loadProfileData } from "@/lib/profile-data";
import { getSession, hasSupabase } from "@/lib/session";

// Step 2 of "Create new profile": the full profile form, shown right after the account is made.
export default async function Welcome() {
  if (hasSupabase) {
    const { user } = await getSession();
    if (!user) redirect("/login");
  }
  const { initial, existing, cities, churches } = await loadProfileData();
  if (hasSupabase && existing) {
    redirect("/home");
  }
  return (
    <Shell>
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest text-goldtext">Step 2 of 2</p>
          <h1 className="font-display text-3xl font-semibold text-heading">Tell us about you</h1>
          <p className="mt-1 text-muted">This creates your profile. You can check in right after.</p>
        </div>
        <MyProfileForm initial={initial} existing={false} cities={cities} churches={churches} onboarding />
      </div>
    </Shell>
  );
}
