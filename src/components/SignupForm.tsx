"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

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
      <div className="mx-auto max-w-sm rounded-lg bg-white p-6 text-center shadow">
        <p className="text-xl font-bold text-heading">{t("sentTitle")}</p>
        <p className="mt-2">{t("sentBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-3 rounded-lg bg-white p-6 shadow">
      <h1 className="text-xl font-bold text-heading">{t("title")}</h1>
      <label className="block">{t("name")}
        <input name="name" required className="mt-1 w-full rounded border p-2" />
      </label>
      <label className="block">{t("email")}
        <input name="email" type="email" required className="mt-1 w-full rounded border p-2" />
      </label>
      <label className="block">{t("password")}
        <input name="password" type="password" minLength={8} required className="mt-1 w-full rounded border p-2" />
      </label>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button disabled={state === "busy"} className="w-full rounded bg-coptic p-2 text-white disabled:opacity-60">{t("submit")}</button>
    </form>
  );
}
