import { getLocale, getTranslations } from "next-intl/server";
import { demoArrivals, demoMembers, demoService } from "@/lib/demo";

export default async function Dashboard() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const byId = new Map(demoMembers.map((m) => [m.id, m]));
  const here = new Set(demoArrivals.map((a) => a.memberId));
  const absent = demoMembers.filter((m) => !here.has(m.id) && m.status === "active");
  const label = (id: string) => (locale === "ar" ? byId.get(id)!.arabic : byId.get(id)!.name);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-coptic">{t("title")}</h1>
      <p className="rounded bg-gold/20 p-3 text-sm">{t("demoNote")}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card label={t("service")} value={locale === "ar" ? demoService.nameAr : demoService.nameEn} />
        <Card label={t("present")} value={String(demoArrivals.length)} />
        <Card label={t("notYet")} value={String(absent.length)} />
      </div>
      <section aria-labelledby="present" className="rounded-lg bg-white p-4 shadow">
        <h2 id="present" className="mb-2 font-bold">{t("present")}</h2>
        <ul className="divide-y">
          {demoArrivals.map((a) => (
            <li key={a.memberId} className="flex justify-between py-2">
              <span>{label(a.memberId)}</span>
              <span>
                {a.time} · {a.late ? `${t("late")} ${a.late} ${t("minutes")}` : t("onTime")}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="absent" className="rounded-lg bg-white p-4 shadow">
        <h2 id="absent" className="mb-2 font-bold">{t("notYet")}</h2>
        <ul className="divide-y">
          {absent.map((m) => (
            <li key={m.id} className="py-2">{locale === "ar" ? m.arabic : m.name}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border-t-4 border-gold bg-white p-4 shadow">
      <div className="text-sm text-ink/70">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
