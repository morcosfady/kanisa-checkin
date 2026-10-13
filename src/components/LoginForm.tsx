"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginForm() {
  const t = useTranslations("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    window.location.href = "/dashboard"; // full load so the new session cookie is used
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-3 rounded-lg bg-white p-6 shadow">
      <h1 className="text-xl font-bold text-heading">{t("title")}</h1>
      <label className="block">{t("email")}
        <input name="email" type="email" required className="mt-1 w-full rounded border p-2" />
      </label>
      <label className="block">{t("password")}
        <input name="password" type="password" required className="mt-1 w-full rounded border p-2" />
      </label>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-coptic p-2 text-white disabled:opacity-60">{t("submit")}</button>
      <p className="text-center"><Link href="/signup" className="text-coptic underline">{t("request")}</Link></p>
    </form>
  );
}
