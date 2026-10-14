"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { b, card } from "@/components/ui";
import { fmtTime } from "@/lib/checkin";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";

type State =
  | { kind: "working" }
  | { kind: "ok"; first: string; at: string; already: boolean }
  | { kind: "fail"; message: string; profile?: boolean };

// Opened by scanning the kiosk QR: checks the signed-in person in automatically
export default function QrCheckIn({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "working" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // run once, even in strict mode
    ran.current = true;
    (async () => {
      if (!hasSupabase) return setState({ kind: "ok", first: "Friend", at: new Date().toISOString(), already: false });
      const { data, error } = await supabaseBrowser().rpc("check_in_qr", { p_token: token });
      if (error) {
        const profile = /profile/i.test(error.message);
        return setState({ kind: "fail", message: error.message, profile });
      }
      if (data.ok) return setState({ kind: "ok", first: data.first_name, at: data.at, already: data.already });
      if (data.error === "locked") return setState({ kind: "fail", message: "Too many tries. Please wait a few minutes, or ask a greeter." });
      setState({ kind: "fail", message: "This QR code has expired. Please scan the one on the kiosk screen again." });
    })();
  }, [token]);

  return (
    <div className={`${card} mx-auto max-w-md space-y-4 p-8 text-center`} role="status" aria-live="polite">
      {state.kind === "working" && (
        <>
          <Loader2 size={44} className="mx-auto animate-spin text-goldtext" />
          <p className="font-display text-xl font-semibold text-heading">Checking you in…</p>
        </>
      )}
      {state.kind === "ok" && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-3">
          <CheckCircle2 size={64} strokeWidth={1.5} className="mx-auto text-success" />
          <p className="font-display text-3xl font-semibold text-heading">Welcome, {state.first} 🙏</p>
          <p className="text-muted num">{state.already ? "You were already checked in at" : "Checked in at"} {fmtTime(state.at)}</p>
          <Link href="/history" className={`${b("secondary")} w-full`}>See my history</Link>
        </motion.div>
      )}
      {state.kind === "fail" && (
        <>
          <AlertTriangle size={44} strokeWidth={1.5} className="mx-auto text-warning" />
          <p className="font-display text-xl font-semibold text-heading">Could not check you in</p>
          <p className="text-muted">{state.message}</p>
          <Link href={state.profile ? "/profile" : "/check-in"} className={`${b("primary")} w-full`}>
            {state.profile ? "Create my profile" : "Use the 3-digit code instead"}
          </Link>
        </>
      )}
    </div>
  );
}
