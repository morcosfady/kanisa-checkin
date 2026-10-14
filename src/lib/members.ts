import type { SupabaseClient } from "@supabase/supabase-js";
import type { DemoMember } from "@/lib/demo";
import type { ChurchRow, CityRow } from "@/lib/places";

export type Member = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  gender: "male" | "female";
  deacon: boolean;
  family: string;
  familyId: string | null;
  status: "active" | "inactive" | "visitor";
  consent: boolean;
  face: "enrolled" | "pending" | "none";
  phone: string;
  email: string;
  dob: string | null;
  className: string;
  lastDays: number | null;
  rate: number | null;
  streak: number | null;
  signedAt: string | null;
  signedBy: string | null;
  address: string;
  apartment: string;
  cityId: string | null;
  city: string;
  churchId: string | null;
  church: string;
  photo: string | null;
  joined: string | null;
  hasNote: boolean;
};

export type FamilyOption = { id: string; name: string };

export const fromDemo = (m: DemoMember): Member => {
  const [firstName, ...rest] = m.name.split(" ");
  return {
    ...m,
    firstName,
    lastName: rest.join(" "),
    familyId: m.family,
    email: "",
    dob: null,
    signedAt: m.consent ? "2026-08-24" : null,
    signedBy: m.consent ? m.name : null,
    address: "", apartment: "", cityId: null, city: "", churchId: null, church: "", photo: null, joined: null, hasNote: false,
  };
};

type Row = {
  id: string;
  first_name: string;
  last_name: string;
  gender: "male" | "female" | null;
  is_deacon: boolean;
  status: Member["status"];
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  biometric_consent: boolean;
  has_face: boolean;
  consent_signed_at: string | null;
  consent_signed_by: string | null;
  address: string | null;
  apartment: string | null;
  city_id: string | null;
  city_other: string | null;
  church_id: string | null;
  church_other: string | null;
  photo_url: string | null;
  created_at: string;
  cities: { name: string } | null;
  churches: { name: string } | null;
  family_id: string | null;
  families: { family_name: string } | null;
  classes: { name_en: string } | null;
};

// Real data: members + attendance summary (rate and last seen come from attendance rows)
export async function loadMembers(db: SupabaseClient, churchId: string | null): Promise<{ members: Member[]; families: FamilyOption[]; cities: CityRow[]; churches: ChurchRow[] }> {
  const [{ data: rows }, { data: fams }, { data: att }, { count: services }, { data: cs }, { data: hs }, { data: noted }] = await Promise.all([
    db
      .from("members")
      .select(
        "id, first_name, last_name, gender, is_deacon, status, phone, email, date_of_birth, biometric_consent, has_face, consent_signed_at, consent_signed_by, address, apartment, city_id, city_other, church_id, church_other, photo_url, created_at, cities(name), churches(name), family_id, families(family_name), classes(name_en)",
      )
      .eq("church_id", churchId ?? "00000000-0000-0000-0000-000000000000")
      .order("first_name")
      .returns<Row[]>(),
    db.from("families").select("id, family_name").order("family_name"),
    db.from("attendance").select("member_id, checked_in_at"),
    db.from("services").select("id", { count: "exact", head: true }),
    db.from("cities").select("id, name").order("name"),
    db.from("churches").select("id, name, city_id").order("name"),
    db.from("pastoral_notes").select("member_id"),
  ]);
  const withNote = new Set((noted ?? []).map((n: { member_id: string }) => n.member_id));

  const seen = new Map<string, { n: number; last: number }>();
  (att ?? []).forEach((a: { member_id: string; checked_in_at: string }) => {
    const t = Date.parse(a.checked_in_at);
    const cur = seen.get(a.member_id) ?? { n: 0, last: 0 };
    seen.set(a.member_id, { n: cur.n + 1, last: Math.max(cur.last, t) });
  });
  const total = Math.min(services ?? 0, 52);

  const members = (rows ?? []).map((r): Member => {
    const s = seen.get(r.id);
    return {
      id: r.id,
      name: `${r.first_name} ${r.last_name}`.trim(),
      firstName: r.first_name,
      lastName: r.last_name,
      gender: r.gender ?? "male",
      deacon: r.is_deacon,
      family: r.families?.family_name ?? "No family",
      familyId: r.family_id,
      status: r.status,
      consent: r.biometric_consent,
      face: !r.biometric_consent ? "none" : r.has_face ? "enrolled" : "pending",
      phone: r.phone ?? "",
      email: r.email ?? "",
      dob: r.date_of_birth,
      className: r.classes?.name_en ?? "",
      lastDays: s ? Math.max(0, Math.floor((Date.now() - s.last) / 86400000)) : null,
      rate: total && s ? Math.min(100, Math.round((s.n / total) * 100)) : null,
      streak: null,
      signedAt: r.consent_signed_at,
      signedBy: r.consent_signed_by,
      address: r.address ?? "",
      apartment: r.apartment ?? "",
      cityId: r.city_id,
      city: r.cities?.name ?? r.city_other ?? "",
      churchId: r.church_id,
      church: r.churches?.name ?? r.church_other ?? "",
      photo: r.photo_url,
      joined: r.created_at,
      hasNote: withNote.has(r.id),
    };
  });
  return { members, cities: (cs ?? []) as CityRow[], churches: (hs ?? []) as ChurchRow[], families: (fams ?? []).map((f: { id: string; family_name: string }) => ({ id: f.id, name: f.family_name })) };
}

export const isMinor = (dob: string | null) => {
  if (!dob) return false;
  const d = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  if (t < new Date(t.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age < 18;
};
