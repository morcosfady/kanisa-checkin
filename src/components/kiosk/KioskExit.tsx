"use client";
import { useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Logo } from "@/components/Logo";
import { b, card } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";

// Hidden way out of the kiosk: press and hold the logo for 2 seconds, then type the admin password.
export default function KioskExit() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const down = () => { timer.current = setTimeout(() => setOpen(true), 2000); };
  const up = () => clearTimeout(timer.current);

  async function exit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    if (hasSupabase) {
      const db = supabaseBrowser();
      const { data } = await db.auth.getUser();
      const { error } = await db.auth.signInWithPassword({ email: data.user?.email ?? "", password: pw });
      if (error) {
        setBusy(false);
        return setErr("That password is not right.");
      }
    }
    router.push("/dashboard");
  }

  return (
    <>
      <span
        onPointerDown={down} onPointerUp={up} onPointerLeave={up} onContextMenu={(e) => e.preventDefault()}
        className="select-none" style={{ touchAction: "none" }}
      >
        <Logo size={44} />
      </span>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Exit kiosk" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <form onSubmit={exit} className={`${card} w-full max-w-sm space-y-4 p-6 text-ink`}>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-heading"><LockKeyhole size={20} /> Exit kiosk</h2>
            <label className="block text-sm font-medium">Admin password
              <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} required className="mt-1 w-full rounded-[8px] border border-line bg-page px-3 py-2.5" />
            </label>
            {err && <p role="alert" className="text-sm text-danger">{err}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setOpen(false); setPw(""); setErr(""); }} className={`${b("secondary")} flex-1`}>Cancel</button>
              <button disabled={busy} className={`${b("primary")} flex-1`}>{busy ? "Checking…" : "Exit"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
