import { getTranslations } from "next-intl/server";
import Shell from "@/components/Shell";

export default async function Pending() {
  const t = await getTranslations("signup");
  return (
    <Shell>
      <div className="mx-auto max-w-sm rounded-lg bg-white p-6 text-center shadow">
        <p className="text-xl font-bold text-coptic">{t("waitingTitle")}</p>
        <p className="mt-2">{t("waitingBody")}</p>
      </div>
    </Shell>
  );
}
