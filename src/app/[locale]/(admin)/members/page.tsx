import { getLocale, getTranslations } from "next-intl/server";
import { demoMembers } from "@/lib/demo";

export default async function Members() {
  const t = await getTranslations("members");
  const locale = await getLocale();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-coptic">{t("title")}</h1>
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full">
          <thead className="bg-coptic/10">
            <tr>
              <th className="p-3 text-start">{t("name")}</th>
              <th className="p-3 text-start">{t("family")}</th>
              <th className="p-3 text-start">{t("status")}</th>
              <th className="p-3 text-start">{t("consent")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {demoMembers.map((m) => (
              <tr key={m.id}>
                <td className="p-3">{locale === "ar" ? m.arabic : m.name}</td>
                <td className="p-3">{m.family}</td>
                <td className="p-3">{m.status}</td>
                <td className="p-3">{m.consent ? t("yes") : t("no")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
