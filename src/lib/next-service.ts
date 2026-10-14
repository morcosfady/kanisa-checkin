import type { SupabaseClient } from "@supabase/supabase-js";

export type NextService = { name: string; label: string; weekday: number; time: string };

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const t12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// Chicago "now": weekday (0 = Sunday) and minutes since midnight
function chicagoNow() {
  const parts = new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "numeric", hour12: false, timeZone: "America/Chicago" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { weekday: DAY.indexOf(get("weekday")), min: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
}

// The next weekly event for a church (starting from now), or null when none is set up
export async function loadNextService(db: SupabaseClient, churchId: string | null): Promise<NextService | null> {
  if (!churchId) return null;
  const { data } = await db.from("service_templates").select("name_en, weekday, start_time").eq("active", true).eq("church_id", churchId);
  const now = chicagoNow();
  const list = (data ?? []).map((t: { name_en: string; weekday: number; start_time: string }) => {
    const [h, m] = t.start_time.split(":").map(Number);
    let days = (t.weekday - now.weekday + 7) % 7;
    if (days === 0 && h * 60 + m <= now.min) days = 7;
    return { t, days, at: days * 1440 + h * 60 + m };
  });
  list.sort((a, b) => a.at - b.at);
  const best = list[0];
  if (!best) return null;
  const when = best.days === 0 ? "Today" : best.days === 1 ? "Tomorrow" : DAY[best.t.weekday];
  return { name: best.t.name_en, label: `${when} ${t12(best.t.start_time)}`, weekday: best.t.weekday, time: best.t.start_time.slice(0, 5) };
}
