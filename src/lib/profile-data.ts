import type { MyProfile } from "@/components/member/MyProfileForm";
import { demoChurches, demoCities, type ChurchRow, type CityRow } from "@/lib/places";
import { getSession, hasSupabase } from "@/lib/session";

type MemberRow = {
  first_name: string; last_name: string; gender: string | null; date_of_birth: string | null; phone: string | null; email: string | null;
  address: string | null; city_id: string | null; city_other: string | null; church_id: string | null; church_other: string | null;
  biometric_consent: boolean; consent_signed_by: string | null; has_face: boolean; families: { family_name: string } | null;
};

export const emptyProfile: MyProfile = {
  firstName: "", lastName: "", gender: "", dob: "", phone: "", email: "", family: "", address: "",
  city: { id: null, text: "" }, church: { id: null, text: "" }, consent: false, signedBy: "",
};

// Everything the profile form needs: my saved profile (if any) and the city and church lists
export async function loadProfileData() {
  let initial = emptyProfile;
  let existing = false;
  let hasFace = false;
  let approved = true;
  let cities: CityRow[] = demoCities;
  let churches: ChurchRow[] = demoChurches;

  if (hasSupabase) {
    const { db, user, profile } = await getSession();
    approved = Boolean(profile?.approved);
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
      const meta = (user!.user_metadata ?? {}) as { first_name?: string; last_name?: string };
      const [first, ...rest] = (profile?.full_name ?? "").split(" ");
      initial = { ...emptyProfile, firstName: meta.first_name ?? first ?? "", lastName: meta.last_name ?? rest.join(" "), email: user!.email ?? "" };
    }
  }
  return { initial, existing, hasFace, approved, cities, churches };
}
