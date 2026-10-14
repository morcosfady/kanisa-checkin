import KioskScreen from "@/components/kiosk/KioskScreen";
import { getSession, hasSupabase } from "@/lib/session";

export default async function Kiosk({ searchParams }: { searchParams: Promise<{ liveness?: string }> }) {
  if (!hasSupabase) return <KioskScreen demo liveness={false} />;

  const { liveness: override } = await searchParams;
  const { db } = await getSession();
  const { data: settings } = await db.from("settings").select("liveness_enabled").limit(1).maybeSingle();
  // ?liveness=off lets an admin turn the spoof check off for one tablet if it rejects real faces
  const liveness = override === "off" ? false : (settings?.liveness_enabled ?? true);
  return <KioskScreen demo={false} liveness={liveness} />;
}
