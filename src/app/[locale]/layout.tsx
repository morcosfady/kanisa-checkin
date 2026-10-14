import type { Metadata } from "next";
import { Cairo, Cinzel, Inter, Noto_Sans_Coptic } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";
import "../globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", weight: ["600", "700"] });
const coptic = Noto_Sans_Coptic({ subsets: ["coptic"], weight: "400", variable: "--font-coptic" });

export const metadata: Metadata = { title: "Amoinee", manifest: "/manifest.webmanifest" };

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
    <html
      lang={locale}
      dir="ltr"
      data-theme="dark"
      suppressHydrationWarning
      className={`${cairo.variable} ${inter.variable} ${cinzel.variable} ${coptic.variable}`}
    >
      <body className="min-h-screen bg-page text-ink antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--card)",
              color: "var(--fg)",
              border: "1px solid var(--line)",
              borderRadius: "12px",
              boxShadow: "var(--sh-soft)",
            },
          }}
        />
      </body>
    </html>
  );
}
