import MyFaceCard from "@/components/member/MyFaceCard";
import MyProfileForm, { type MyProfile } from "@/components/member/MyProfileForm";
import { getSession, hasSupabase } from "@/lib/session";

export default async function Profile() {
  let initial: MyProfile = { firstName: "", lastName: "", gender: "male", dob: "", phone: "", email: "", family: "", consent: false, signedBy: "" };
  let existing = false;
  let hasFace = false;

  if (hasSupabase) {
    const { db, user } = await getSession();
    const { data: m } = await db
      .from("members")
      .select("first_name, last_name, gender, date_of_birth, phone, email, biometric_consent, consent_signed_by, has_face, families(family_name)")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (m) {
      existing = true;
      hasFace = Boolean(m.has_face);
      const fam = m.families as unknown as { family_name: string } | null;
      initial = {
        firstName: m.first_name, lastName: m.last_name, gender: m.gender ?? "male", dob: m.date_of_birth ?? "",
        phone: m.phone ?? "", email: m.email ?? user!.email ?? "", family: fam?.family_name ?? "",
        consent: m.biometric_consent, signedBy: m.consent_signed_by ?? "",
      };
    } else {
      const { profile } = await getSession();
      const [first, ...rest] = (profile?.full_name ?? "").split(" ");
      initial = { ...initial, firstName: first ?? "", lastName: rest.join(" "), email: user!.email ?? "" };
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-center font-display text-3xl font-semibold text-heading">{existing ? "My profile" : "Create my profile"}</h1>
      <MyProfileForm initial={initial} existing={existing} />
      {existing && initial.consent && <MyFaceCard name={initial.firstName} enrolled={hasFace} />}
    </div>
  );
}
