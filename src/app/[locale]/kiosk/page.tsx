import { getLocale, getTranslations } from "next-intl/server";
import KioskDemo from "@/components/KioskDemo";
import { Logo } from "@/components/Logo";
import { demoMembers, demoService } from "@/lib/demo";

export default async function Kiosk() {
  const t = await getTranslations("kiosk");
  const locale = await getLocale();
  const names = demoMembers.filter((m) => m.consent).map((m) => (locale === "ar" ? m.arabic : m.name));
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-coptic p-6 text-center text-white">
      <Logo size={96} stacked />
      <h1 className="text-3xl font-bold">
        {t("service")}: {locale === "ar" ? demoService.nameAr : demoService.nameEn}
      </h1>
      <KioskDemo
        names={names}
        labels={{
          look: t("lookStraight"),
          simulate: t("simulate"),
          demo: t("demo"),
          already: t("already"),
          welcomeTemplate: t("welcome", { name: "{name}" }),
          notRecognized: t("notRecognized"),
          searchName: t("searchName"),
          scanQr: t("scanQr"),
          imNew: t("imNew"),
        }}
      />
    </main>
  );
}
