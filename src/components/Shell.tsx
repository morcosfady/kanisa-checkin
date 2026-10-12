import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";
import SignOut from "@/components/SignOut";

export default async function Shell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  const signedIn = hasSupabase && Boolean((await (await supabaseServer()).auth.getUser()).data.user);
  const links = [
    ["/dashboard", t("nav.dashboard")],
    ["/members", t("nav.members")],
    ["/kiosk", t("nav.kiosk")],
    ["/privacy", t("nav.privacy")],
  ] as const;

  return (
    <div>
      <header className="bg-coptic text-cream">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/dashboard" className="me-auto" aria-label="Tenhos"><Logo size={44} /></Link>
          <nav className="flex flex-wrap gap-4" aria-label="Main">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="underline-offset-4 hover:underline focus:underline">{label}</Link>
            ))}
          </nav>
          {signedIn && <SignOut label={t("nav.logout")} />}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
