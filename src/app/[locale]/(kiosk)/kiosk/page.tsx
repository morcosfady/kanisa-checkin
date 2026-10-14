import KioskScreen from "@/components/kiosk/KioskScreen";
import { loadAdminChurch } from "@/lib/kinds";
import { loadNextService } from "@/lib/next-service";
import { getSession, hasSupabase } from "@/lib/session";

export default async function Kiosk({ searchParams }: { searchParams: Promise<{ liveness?: string }> }) {
  if (!hasSupabase) return <KioskScreen demo liveness={false} next={{ name: "Divine Liturgy", label: "Sun 8:00 AM", weekday: 0, time: "08:00" }} />;

  const { liveness: override } = await searchParams;
  const { db, user } = await getSession();
  const { data: settings } = await db.from("settings").select("liveness_enabled").limit(1).maybeSingle();
  const { church } = await loadAdminChurch(db, user!.id);
  const next = await loadNextService(db, church?.id ?? null);
  // ?liveness=off lets an admin turn the spoof check off for one tablet if it rejects real faces
  const liveness = override === "off" ? false : (settings?.liveness_enabled ?? true);
  return <KioskScreen demo={false} liveness={liveness} next={next} />;
}
