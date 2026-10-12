import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Shell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const other = locale === "ar" ? "en" : "ar";
  const links = [
    ["/dashboard", t("nav.dashboard")],
    ["/members", t("nav.members")],
    ["/kiosk", t("nav.kiosk")],
    ["/privacy", t("nav.privacy")],
  ] as const;

  return (
    <div>
      <header className="bg-coptic text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
          <span aria-hidden className="text-2xl text-gold">☦</span>
          <strong className="me-auto">{t("app.name")}</strong>
          <nav className="flex flex-wrap gap-4" aria-label="Main">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="underline-offset-4 hover:underline focus:underline">{label}</Link>
            ))}
          </nav>
          <Link href="/dashboard" locale={other} className="rounded border border-gold px-3 py-1 text-gold">
            {t("nav.lang")}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
