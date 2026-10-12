import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { hasSupabase, SUPABASE_KEY, SUPABASE_URL } from "./lib/supabase/env";

const intl = createMiddleware(routing);
const PROTECTED = ["/dashboard", "/members", "/services", "/attendance", "/reports", "/followups", "/settings"];

export default async function proxy(req: NextRequest) {
  const res = intl(req);
  if (!hasSupabase) return res; // demo mode

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
  const { data } = await supabase.auth.getUser();

  const match = req.nextUrl.pathname.match(/^\/(ar|en)(\/.*)?$/);
  const locale = match?.[1] ?? routing.defaultLocale;
  const path = match?.[2] ?? "/";
  if (!data.user && PROTECTED.some((p) => path.startsWith(p))) {
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
