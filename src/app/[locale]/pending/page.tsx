import { Hourglass } from "lucide-react";
import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { card } from "@/components/ui";
import { getSession, hasSupabase } from "@/lib/session";

export default async function Pending() {
  let email = "";
  if (hasSupabase) {
    const { db, user, profile } = await getSession();
    if (!user) redirect("/login");
    if (profile?.approved) redirect("/home");
    email = user.email ?? "";
    // account exists but the profile form was not finished yet
    const { data: me } = await db.from("members").select("id").eq("user_id", user.id).maybeSingle();
    if (!me) redirect("/welcome");
  }
  return (
    <Shell>
      <div className={`${card} mx-auto max-w-sm space-y-2 p-8 text-center`}>
        <Hourglass size={40} strokeWidth={1.5} className="mx-auto text-goldtext" />
        <p className="font-display text-2xl font-semibold text-heading">Profile sent 🙏</p>
        <p className="text-muted">Thank you. Abouna will review your profile. You can check in as soon as it is approved.</p>
        {email && <p className="pt-2 text-sm text-muted">Signed in as <b className="text-ink">{email}</b></p>}
      </div>
    </Shell>
  );
}
