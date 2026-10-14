"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { b, card } from "@/components/ui";
import { fmtTime } from "@/lib/checkin";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";

type Props = {
  firstName: string | null; // null = no profile yet
  service: { name: string; when: string } | null;
  checkedInAt: string | null;
};

export default function CheckInCard({ firstName, service, checkedInAt }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(checkedInAt);

  async function checkIn() {
    setBusy(true);
    if (!hasSupabase) {
      setDone(new Date().toISOString());
      setBusy(false);
      return toast.success("Checked in (demo)");
    }
    const { data, error } = await supabaseBrowser().rpc("check_in_self");
    setBusy(false);
    if (error) return toast.error(error.message);
    setDone(data.at);
    toast.success(data.already ? "You were already checked in" : "You are checked in. Welcome 🙏");
    router.refresh();
  }

  if (firstName === null) {
    return (
      <div className={`${card} mx-auto max-w-md space-y-3 p-8 text-center`}>
        <UserRound size={40} strokeWidth={1.5} className="mx-auto text-goldtext" />
        <h2 className="font-display text-2xl font-semibold text-heading">Create your profile first</h2>
        <p className="text-muted">It takes one minute. Then you can check in with one tap.</p>
        <Link href="/profile" className={`${b("primary")} w-full`}>Create my profile</Link>
      </div>
    );
  }

  if (!service) {
    return (
      <div className={`${card} mx-auto max-w-md space-y-3 p-8 text-center`}>
        <CalendarClock size={40} strokeWidth={1.5} className="mx-auto text-goldtext" />
        <h2 className="font-display text-2xl font-semibold text-heading">No service is open right now</h2>
        <p className="text-muted">Check-in opens when Abouna starts the service. Please come back then.</p>
      </div>
    );
  }

  return (
    <div className={`${card} mx-auto max-w-md space-y-5 p-8 text-center`}>
      <div>
        <p className="text-sm uppercase tracking-widest text-goldtext">Now serving</p>
        <h2 className="font-display text-3xl font-semibold text-heading">{service.name}</h2>
        <p className="mt-1 text-muted">{service.when}</p>
      </div>

      {done ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-2 rounded-[16px] bg-success-tint p-6 text-success">
          <CheckCircle2 size={56} strokeWidth={1.5} className="mx-auto" />
          <p className="font-display text-2xl font-semibold">Welcome, {firstName} 🙏</p>
          <p className="num">Checked in at {fmtTime(done)}</p>
        </motion.div>
      ) : (
        <>
          <p className="text-lg">Hello, {firstName}.</p>
          <button onClick={checkIn} disabled={busy} className={`${b("primary")} w-full !py-5 !text-xl`}>
            <CheckCircle2 size={26} strokeWidth={1.75} /> {busy ? "Checking in…" : "I’m here"}
          </button>
        </>
      )}
    </div>
  );
}
