"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, CalendarCheck, CalendarDays, CheckCircle2, History, LogOut, ScanFace, ShieldCheck, UserRound, Users } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { Avatar, Badge } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

export type HeaderUser = { name: string; role: string; pending: number; approved: boolean } | null;

type NavItem = { href: string; label: string; short?: string; icon: typeof Users; badge?: boolean; hidden?: boolean };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Today", icon: CalendarCheck },
  { href: "/members", label: "Members", icon: Users },
  { href: "/kiosk", label: "Check-in Kiosk", short: "Check-in", icon: ScanFace },
  { href: "/schedule", label: "Weekly events", short: "Schedule", icon: CalendarDays },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck, badge: true },
  { href: "/reports", label: "Reports", icon: BarChart3, hidden: true }, // page not built yet
];

const MEMBER_NAV: NavItem[] = [
  { href: "/check-in", label: "Check in", icon: CheckCircle2 },
  { href: "/profile", label: "My profile", short: "Profile", icon: UserRound },
  { href: "/history", label: "My history", short: "History", icon: History },
];

export default function AppHeader({ user }: { user: HeaderUser }) {
  const path = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMember = user?.role === "member";
  const items = !user?.approved ? [] : isMember ? MEMBER_NAV : NAV.filter((n) => !n.hidden && user);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 6);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function signOut() {
    if (hasSupabase) await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const active = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b border-gold/30 text-cream transition-all ${
          scrolled ? "bg-coptic/90 backdrop-blur-md shadow-lift" : "bg-coptic"
        }`}
      >
        <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-2.5 sm:px-6">
          <Link href={!user ? "/login" : !user.approved ? "/pending" : isMember ? "/check-in" : "/dashboard"} aria-label="Amoinee home" className="me-auto md:me-6">
            <Logo size={40} />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex md:me-auto">
            {items.map(({ href, label, icon: Icon, badge }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={`relative flex items-center gap-2 rounded-[12px] px-3 py-2 text-sm font-medium transition hover:bg-white/10 ${
                  active(href) ? "text-white" : "text-cream/80"
                }`}
              >
                <Icon size={20} strokeWidth={1.75} />
                {label}
                {badge && user && user.pending > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-5 text-white num">
                    {user.pending}
                  </span>
                )}
                {active(href) && (
                  <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded bg-gold" />
                )}
              </Link>
            ))}
          </nav>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenu(!menu)}
                aria-haspopup="menu"
                aria-expanded={menu}
                aria-label="User menu"
                className="flex items-center gap-2 rounded-[12px] p-1 pe-2 transition hover:bg-white/10"
              >
                <Avatar name={user.name} size={32} />
                <span className="hidden text-start text-sm leading-tight sm:block">
                  <span className="block font-medium">{user.name}</span>
                </span>
              </button>
              {menu && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  role="menu"
                  className="absolute end-0 mt-2 w-64 rounded-[16px] border border-line bg-card p-3 text-ink shadow-lift"
                >
                  <div className="flex items-center gap-3 border-b border-line pb-3">
                    <Avatar name={user.name} size={40} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{user.name}</div>
                      <Badge tone="gold">{user.role === "super_admin" ? "Admin" : user.role === "servant" ? "Servant" : "Member"}</Badge>
                    </div>
                  </div>
                  <button
                    role="menuitem"
                    onClick={signOut}
                    className="mt-2 flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-sm font-medium hover:bg-hover"
                  >
                    <LogOut size={18} strokeWidth={1.75} /> Sign out
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <Link href="/login" className="rounded-[12px] border border-gold px-3 py-1.5 text-sm font-medium text-gold-light hover:bg-white/10">
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* phone: bottom tab bar */}
      {items.length > 0 && (
        <nav
          aria-label="Main mobile"
          className="fixed inset-x-0 bottom-0 z-40 grid border-t border-gold/30 bg-coptic/95 pb-[env(safe-area-inset-bottom)] text-cream backdrop-blur-md md:hidden"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map(({ href, label, short, icon: Icon, badge }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active(href) ? "text-gold-light" : "text-cream/75"}`}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={1.75} />
                {badge && user && user.pending > 0 && (
                  <span className="absolute -end-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                    {user.pending}
                  </span>
                )}
              </span>
              {short ?? label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
