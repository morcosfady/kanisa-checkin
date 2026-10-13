import { getTranslations } from "next-intl/server";
import { demoMembers } from "@/lib/demo";

// deacon wins over gender for the row colour
const rowColor = (m: { gender: string; deacon: boolean }) =>
  m.deacon ? "bg-amber-200" : m.gender === "male" ? "bg-sky-100" : "bg-pink-100";

export default async function Members() {
  const t = await getTranslations("members");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-coptic">{t("title")}</h1>
      <ul className="flex flex-wrap gap-4 text-sm" aria-label={t("legend")}>
        <li className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-sky-100 ring-1 ring-ink/20" />{t("male")}</li>
        <li className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-pink-100 ring-1 ring-ink/20" />{t("female")}</li>
        <li className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-amber-200 ring-1 ring-ink/20" />{t("deacon")}</li>
      </ul>
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full">
          <thead className="bg-coptic/10">
            <tr>
              <th className="p-3 text-start">{t("name")}</th>
              <th className="p-3 text-start">{t("family")}</th>
              <th className="p-3 text-start">{t("gender")}</th>
              <th className="p-3 text-start">{t("deacon")}</th>
              <th className="p-3 text-start">{t("status")}</th>
              <th className="p-3 text-start">{t("consent")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {demoMembers.map((m) => (
              <tr key={m.id} className={rowColor(m)}>
                <td className="p-3">{m.name}</td>
                <td className="p-3">{m.family}</td>
                <td className="p-3">{m.gender === "male" ? t("male") : t("female")}</td>
                <td className="p-3">{m.deacon ? t("yes") : t("no")}</td>
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
