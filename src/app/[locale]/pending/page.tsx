import { getTranslations } from "next-intl/server";
import Shell from "@/components/Shell";
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
      <div className="mx-auto max-w-sm rounded-lg bg-white p-6 text-center shadow">
        <p className="text-xl font-bold text-coptic">{t("waitingTitle")}</p>
        <p className="mt-2">{t("waitingBody")}</p>
        {email && <p className="mt-3 text-sm text-ink/70">{t("signedInAs")} <b>{email}</b></p>}
      </div>
    </Shell>
  );
}
