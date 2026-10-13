import { getTranslations } from "next-intl/server";
import Shell from "@/components/Shell";

export default async function Privacy() {
  const t = await getTranslations("privacy");
  const sections = ["collect", "why", "keep", "withdraw"] as const;
  return (
    <Shell>
      <article className="space-y-4">
        <h1 className="text-2xl font-bold text-heading">{t("title")}</h1>
        {sections.map((s) => (
          <section key={s}>
            <h2 className="font-bold">{t(s)}</h2>
            <p>{t(`${s}Body`)}</p>
          </section>
        ))}
        <p className="rounded bg-gold/20 p-3">{t("share")}</p>
      </article>
    </Shell>
  );
}
