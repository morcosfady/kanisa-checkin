import MyFaceCard from "@/components/member/MyFaceCard";
import MyProfileForm, { type MyProfile } from "@/components/member/MyProfileForm";
import { demoChurches, demoCities, type ChurchRow, type CityRow } from "@/lib/places";
import { getSession, hasSupabase } from "@/lib/session";

type MemberRow = {
  first_name: string; last_name: string; gender: string | null; date_of_birth: string | null; phone: string | null; email: string | null;
  address: string | null; city_id: string | null; city_other: string | null; church_id: string | null; church_other: string | null;
  biometric_consent: boolean; consent_signed_by: string | null; has_face: boolean; families: { family_name: string } | null;
};

export default async function Profile() {
  let initial: MyProfile = {
    firstName: "", lastName: "", gender: "", dob: "", phone: "", email: "", family: "", address: "",
    city: { id: null, text: "" }, church: { id: null, text: "" }, consent: false, signedBy: "",
  };
  let existing = false;
  let hasFace = false;
  let cities: CityRow[] = demoCities;
  let churches: ChurchRow[] = demoChurches;

  if (hasSupabase) {
    const { db, user, profile } = await getSession();
    const [{ data: m }, { data: cs }, { data: hs }] = await Promise.all([
      db
        .from("members")
        .select("first_name, last_name, gender, date_of_birth, phone, email, address, city_id, city_other, church_id, church_other, biometric_consent, consent_signed_by, has_face, families(family_name)")
        .eq("user_id", user!.id)
        .maybeSingle<MemberRow>(),
      db.from("cities").select("id, name").order("name"),
      db.from("churches").select("id, name, city_id").order("name"),
    ]);
    cities = cs ?? [];
    churches = hs ?? [];
    if (m) {
      existing = true;
      hasFace = Boolean(m.has_face);
      initial = {
        firstName: m.first_name, lastName: m.last_name, gender: m.gender ?? "", dob: m.date_of_birth ?? "",
        phone: m.phone ?? "", email: m.email ?? user!.email ?? "", family: m.families?.family_name ?? "", address: m.address ?? "",
        city: m.city_id ? { id: m.city_id, text: cities.find((c) => c.id === m.city_id)?.name ?? "" } : { id: null, text: m.city_other ?? "" },
        church: m.church_id ? { id: m.church_id, text: churches.find((c) => c.id === m.church_id)?.name ?? "" } : { id: null, text: m.church_other ?? "" },
        consent: m.biometric_consent, signedBy: m.consent_signed_by ?? "",
      };
    } else {
      const [first, ...rest] = (profile?.full_name ?? "").split(" ");
      initial = { ...initial, firstName: first ?? "", lastName: rest.join(" "), email: user!.email ?? "" };
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-center font-display text-3xl font-semibold text-heading">{existing ? "My profile" : "Create my profile"}</h1>
      <MyProfileForm initial={initial} existing={existing} cities={cities} churches={churches} />
      {existing && initial.consent && <MyFaceCard name={initial.firstName} enrolled={hasFace} />}
    </div>
  );
}
