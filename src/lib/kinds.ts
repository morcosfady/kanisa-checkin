import type { SupabaseClient } from "@supabase/supabase-js";

export type Kind = { id: string; name: string; type: string };
export type AdminChurch = { id: string; name: string } | null;

// What new churches start with (the database seeds the same list when an admin picks their church)
export const demoKinds: Kind[] = [
  ["Divine Liturgy", "mass"], ["Vespers", "vespers"], ["Bible Study", "bible_study"], ["Sunday School", "sunday_school"],
  ["Choir", "other"], ["Theater Activity", "other"], ["High School Meeting", "other"],
  ["Family Meeting (Arabic)", "other"], ["Family Meeting (English)", "other"], ["Men Meeting", "other"], ["Women Meeting", "other"],
  ["Youth Meeting (Arabic)", "other"], ["Youth Meeting (English)", "other"],
].map(([name, type]) => ({ id: name, name, type }));

// The church this admin serves, and the services that church offers (RLS keeps other churches out)
export async function loadAdminChurch(db: SupabaseClient, userId: string): Promise<{ church: AdminChurch; kinds: Kind[] }> {
  const { data: p } = await db.from("profiles").select("church_id, churches(name)").eq("id", userId).maybeSingle();
  const id = (p?.church_id as string | null) ?? null;
  if (!id) return { church: null, kinds: [] };
  const name = (p?.churches as unknown as { name: string } | null)?.name ?? "";
  const { data: ks } = await db.from("service_kinds").select("id, name, type").eq("church_id", id).order("name");
  return { church: { id, name }, kinds: (ks ?? []) as Kind[] };
}
