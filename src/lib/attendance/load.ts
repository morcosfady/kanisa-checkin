import type { SupabaseClient } from "@supabase/supabase-js";
import type { Raw } from "./calc";

// Today in the church's time zone, as YYYY-MM-DD
export const chicagoToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

// One call for everything the sheet needs. Also keeps the automatic labels up to date.
export async function loadAttendance(db: SupabaseClient, churchId: string, from: string, to: string): Promise<Raw> {
  await db.rpc("sync_auto_labels", { p_church: churchId });
  const { data, error } = await db.rpc("get_attendance_data", { p_church: churchId, p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return data as Raw;
}
