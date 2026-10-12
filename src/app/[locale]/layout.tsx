import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { title: "Kanisa Check-in", manifest: "/manifest.webmanifest" };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${cairo.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-cream text-ink antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
