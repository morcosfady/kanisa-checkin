import { Hourglass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Shell from "@/components/Shell";
import { card } from "@/components/ui";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Pending() {
  const t = await getTranslations("signup");
  let email = "";
  if (hasSupabase) {
    const { data } = await (await supabaseServer()).auth.getUser();
    email = data.user?.email ?? "";
  }
  return (
    <Shell>
      <div className={`${card} mx-auto max-w-sm space-y-2 p-8 text-center`}>
        <Hourglass size={40} strokeWidth={1.5} className="mx-auto text-goldtext" />
        <p className="font-display text-2xl font-semibold text-heading">{t("waitingTitle")}</p>
        <p className="text-muted">{t("waitingBody")}</p>
        {email && <p className="pt-2 text-sm text-muted">{t("signedInAs")} <b className="text-ink">{email}</b></p>}
      </div>
    </Shell>
  );
}
