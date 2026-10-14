import MyFaceCard from "@/components/member/MyFaceCard";
import MyProfileForm from "@/components/member/MyProfileForm";
import { loadProfileData } from "@/lib/profile-data";

export default async function Profile() {
  const { initial, existing, hasFace, cities, churches } = await loadProfileData();
  return (
    <div className="space-y-6">
      <h1 className="text-center font-display text-3xl font-semibold text-heading">{existing ? "My profile" : "Create my profile"}</h1>
      <MyProfileForm initial={initial} existing={existing} cities={cities} churches={churches} />
      {existing && initial.consent && <MyFaceCard name={initial.firstName} enrolled={hasFace} />}
    </div>
  );
}
