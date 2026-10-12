"use client";
import { useRouter } from "@/i18n/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignOut({ label }: { label: string }) {
  const router = useRouter();
  async function out() {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return <button onClick={out} className="rounded border border-cream/60 px-3 py-1">{label}</button>;
}
