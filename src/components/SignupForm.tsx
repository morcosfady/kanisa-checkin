"use client";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { b, card } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";

// Step 1 of "Create new profile": make the login. Step 2 (/welcome) is the full profile form.
export default function SignupForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    const password = String(f.get("password"));
    const res = await fetch("/api/signup", { method: "POST", body: JSON.stringify({ name: f.get("name"), email, password }) });
    const body = await res.json();
    if (!res.ok) {
      setBusy(false);
      return setError(/already/i.test(body.error ?? "") ? "That email already has an account. Please sign in instead." : (body.error ?? "Something went wrong."));
    }
    const { error: signInError } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    if (signInError) {
      setBusy(false);
      return setError("Your account was created. Please sign in to continue.");
    }
    window.location.href = "/welcome"; // full load so the new session is used
  }

  const input = "mt-1 w-full rounded-[8px] border border-line bg-page px-3 py-2.5 outline-none focus:border-gold";
  return (
    <form onSubmit={submit} className={`${card} w-full max-w-sm space-y-4 p-7`}>
      <div>
        <p className="text-sm uppercase tracking-widest text-goldtext">Step 1 of 2</p>
        <h1 className="font-display text-2xl font-semibold text-heading">Create new profile</h1>
        <p className="mt-1 text-sm text-muted">First your login. Next you will fill in your profile.</p>
      </div>
      <label className="block text-sm font-medium">Full name<input name="name" required autoComplete="name" className={input} /></label>
      <label className="block text-sm font-medium">Email<input name="email" type="email" required autoComplete="email" className={input} /></label>
      <label className="block text-sm font-medium">Password (8+ characters)<input name="password" type="password" minLength={8} required autoComplete="new-password" className={input} /></label>
      {error && <p role="alert" className="rounded-[8px] bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      <button disabled={busy} className={`${b("primary")} w-full !py-2.5`}>{busy ? "Creating…" : "Continue"}</button>
      <p className="text-center text-sm"><Link href="/login" className="font-medium text-heading underline underline-offset-4">Back to sign in</Link></p>
    </form>
  );
}
