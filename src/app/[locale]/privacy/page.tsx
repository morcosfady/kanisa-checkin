import { Clock, Database, ShieldCheck, Target, UserX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Shell from "@/components/Shell";
import { card } from "@/components/ui";

export default async function Privacy() {
  const t = await getTranslations("privacy");
  const sections = [
    { key: "collect", icon: Database },
    { key: "why", icon: Target },
    { key: "keep", icon: Clock },
    { key: "withdraw", icon: UserX },
  ] as const;
  return (
    <Shell>
      <article className="mx-auto max-w-[720px] space-y-5">
        <h1 className="font-display text-3xl font-semibold text-heading">{t("title")}</h1>
        {sections.map(({ key, icon: Icon }) => (
          <section key={key} className={`${card} flex gap-4 p-5`}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-gold/20 text-goldtext"><Icon size={20} strokeWidth={1.75} /></span>
            <div>
              <h2 className="font-display text-lg font-semibold text-heading">{t(key)}</h2>
              <p className="mt-1 leading-relaxed text-ink/90">{t(`${key}Body`)}</p>
            </div>
          </section>
        ))}
        <p className="flex gap-3 rounded-[16px] bg-gold/15 p-5 leading-relaxed">
          <ShieldCheck size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-goldtext" />
          {t("share")}
        </p>
      </article>
    </Shell>
  );
}
