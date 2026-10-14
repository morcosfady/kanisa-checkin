"use client";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, QrCode, UserRound } from "lucide-react";
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
  const [digits, setDigits] = useState(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(checkedInAt);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  async function submit(code: string) {
    setBusy(true);
    setError("");
    if (!hasSupabase) {
      setDone(new Date().toISOString());
      setBusy(false);
      return toast.success("Checked in (demo)");
    }
    const { data, error: err } = await supabaseBrowser().rpc("check_in_code", { p_code: code });
    setBusy(false);
    if (err) return setError(err.message);
    if (data.ok) {
      setDone(data.at);
      toast.success(data.already ? "You were already checked in" : "You are checked in. Welcome 🙏");
      router.refresh();
      return;
    }
    setDigits(["", "", ""]);
    boxes.current[0]?.focus();
    if (data.error === "locked") setError("Too many wrong codes. Please wait 10 minutes, or ask a greeter to check you in.");
    else setError(`That code is not right. ${data.attempts_left} ${data.attempts_left === 1 ? "try" : "tries"} left. Look at the kiosk screen.`);
  }

  function change(i: number, value: string) {
    const v = value.replace(/\D/g, "");
    if (v.length > 1) {
      // pasted or auto-filled code
      const next = [v[0] ?? "", v[1] ?? "", v[2] ?? ""];
      setDigits(next);
      if (next.every(Boolean)) submit(next.join(""));
      return;
    }
    const next = digits.map((d, j) => (j === i ? v : d));
    setDigits(next);
    if (v && i < 2) boxes.current[i + 1]?.focus();
    if (next.every(Boolean)) submit(next.join(""));
  }

  if (firstName === null) {
    return (
      <div className={`${card} mx-auto max-w-md space-y-3 p-8 text-center`}>
        <UserRound size={40} strokeWidth={1.5} className="mx-auto text-goldtext" />
        <h2 className="font-display text-2xl font-semibold text-heading">Create your profile first</h2>
        <p className="text-muted">It takes one minute. Then you can check in with the code or the QR.</p>
        <Link href="/profile" className={`${b("primary")} w-full`}>Create my profile</Link>
      </div>
    );
  }

  if (!service) {
    return (
      <div className={`${card} mx-auto max-w-md space-y-3 p-8 text-center`}>
        <CalendarClock size={40} strokeWidth={1.5} className="mx-auto text-goldtext" />
        <h2 className="font-display text-2xl font-semibold text-heading">No service is open right now</h2>
        <p className="text-muted">Check-in opens automatically at the scheduled time. Please come back then.</p>
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
          <div>
            <p className="text-lg font-medium">Hello, {firstName}.</p>
            <p className="text-muted">Type the 3-digit code shown on the kiosk screen.</p>
          </div>
          <div className="flex justify-center gap-3" role="group" aria-label="3-digit check-in code">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { boxes.current[i] = el; }}
                value={d}
                onChange={(e) => change(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Backspace" && !d && i > 0) boxes.current[i - 1]?.focus(); }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={3}
                disabled={busy}
                aria-label={`Digit ${i + 1}`}
                className="h-20 w-16 rounded-[16px] border-2 border-line bg-page text-center font-display text-4xl font-semibold text-heading outline-none focus:border-gold disabled:opacity-60 num"
              />
            ))}
          </div>
          {error && <p role="alert" className="rounded-[8px] bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
          <p className="flex items-center justify-center gap-2 text-sm text-muted"><QrCode size={16} strokeWidth={1.75} /> Or scan the QR code on the kiosk with your phone camera.</p>
        </>
      )}
    </div>
  );
}
