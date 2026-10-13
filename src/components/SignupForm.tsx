"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { b, card } from "@/components/ui";

export default function SignupForm() {
  const t = useTranslations("signup");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy");
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/signup", {
      method: "POST",
      body: JSON.stringify({ name: f.get("name"), email: f.get("email"), password: f.get("password") }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? t("failed"));
      return setState("idle");
    }
    setState("done");
  }

  if (state === "done") {
    return (
      <div className={`${card} w-full max-w-sm space-y-3 p-7 text-center`}>
        <MailCheck size={40} strokeWidth={1.5} className="mx-auto text-success" />
        <p className="font-display text-2xl font-semibold text-heading">{t("sentTitle")}</p>
        <p className="text-muted">{t("sentBody")}</p>
        <Link href="/login" className={`${b("secondary")} w-full`}>Back to sign in</Link>
      </div>
    );
  }

  const input = "mt-1 w-full rounded-[8px] border border-line bg-page px-3 py-2.5 outline-none focus:border-gold";
  return (
    <form onSubmit={submit} className={`${card} w-full max-w-sm space-y-4 p-7`}>
      <div>
        <h1 className="font-display text-2xl font-semibold text-heading">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">Abouna will review your request.</p>
      </div>
      <label className="block text-sm font-medium">{t("name")}<input name="name" required className={input} /></label>
      <label className="block text-sm font-medium">{t("email")}<input name="email" type="email" required className={input} /></label>
      <label className="block text-sm font-medium">{t("password")}<input name="password" type="password" minLength={8} required className={input} /></label>
      {error && <p role="alert" className="rounded-[8px] bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      <button disabled={state === "busy"} className={`${b("primary")} w-full !py-2.5`}>{t("submit")}</button>
      <p className="text-center text-sm"><Link href="/login" className="font-medium text-heading underline underline-offset-4">Back to sign in</Link></p>
    </form>
  );
}
