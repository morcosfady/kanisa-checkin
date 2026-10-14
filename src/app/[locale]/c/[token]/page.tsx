import { redirect } from "next/navigation";
import QrCheckIn from "@/components/member/QrCheckIn";
import Shell from "@/components/Shell";
import { getSession, hasSupabase } from "@/lib/session";

// The kiosk QR opens this page. Not signed in: sign in first, then come straight back here.
// (Lives outside the member route group so its own redirect keeps the ?next= link.)
export default async function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(token)) redirect("/check-in");
  if (hasSupabase) {
    const { user, profile } = await getSession();
    if (!user) redirect(`/login?next=${encodeURIComponent(`/c/${token}`)}`);
    if (!profile?.approved) redirect("/pending");
  }
  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-center font-display text-3xl font-semibold text-heading">Check in</h1>
        <QrCheckIn token={token} />
      </div>
    </Shell>
  );
}
