"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { b, card } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginForm() {
  const t = useTranslations("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const { error } = await supabaseBrowser().auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setBusy(false);
    if (error) return setError(t("failed"));
    window.location.href = "/home"; // full load so the new session cookie is used
  }

  const input = "w-full rounded-[8px] border border-line bg-page py-2.5 ps-10 pe-3 outline-none focus:border-gold";
  return (
    <form onSubmit={submit} className={`${card} w-full max-w-sm space-y-4 p-7`}>
      <div>
        <h1 className="font-display text-2xl font-semibold text-heading">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">Welcome back to Amoinee.</p>
      </div>
      <label className="block text-sm font-medium">{t("email")}
        <span className="relative mt-1 block">
          <Mail size={18} strokeWidth={1.75} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="email" type="email" required autoComplete="email" className={input} />
        </span>
      </label>
      <label className="block text-sm font-medium">{t("password")}
        <span className="relative mt-1 block">
          <Lock size={18} strokeWidth={1.75} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="password" type={show ? "text" : "password"} required autoComplete="current-password" className={input} />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute end-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[8px] text-muted hover:bg-hover">
            {show ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
          </button>
        </span>
      </label>
      {error && <p role="alert" className="rounded-[8px] bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      <button disabled={busy} className={`${b("primary")} w-full !py-2.5`}>{busy ? "Signing in…" : t("submit")}</button>
      <p className="text-center text-sm">
        <Link href="/signup" className="font-medium text-heading underline underline-offset-4">{t("request")}</Link>
      </p>
    </form>
  );
}
