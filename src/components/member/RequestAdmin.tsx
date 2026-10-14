"use client";
import { useMemo, useState } from "react";
import { Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Combobox, { type Choice } from "@/components/Combobox";
import { b, card } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { churchOptions, type ChurchRow, type CityRow } from "@/lib/places";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";

// For priests: ask to become an admin of a church. An admin of that church, or the super admin, approves.
export default function RequestAdmin({ pending, churches, cities }: { pending: string | null; churches: ChurchRow[]; cities: CityRow[] }) {
  const router = useRouter();
  const [church, setChurch] = useState<Choice>({ id: null, text: "" });
  const [busy, setBusy] = useState(false);
  const [demoPending, setDemoPending] = useState<string | null>(null);
  const options = useMemo(() => churchOptions(churches, cities), [churches, cities]);
  const waiting = hasSupabase ? pending : demoPending;

  async function send() {
    if (!church.id) return;
    setBusy(true);
    if (!hasSupabase) {
      setBusy(false);
      setDemoPending(church.text);
      return toast.success("Request sent (demo)");
    }
    const { error } = await supabaseBrowser().rpc("request_admin", { p_church: church.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Request sent. An admin of that church will review it 🙏");
    router.refresh();
  }

  async function cancel() {
    if (!hasSupabase) return setDemoPending(null);
    const { error } = await supabaseBrowser().rpc("cancel_admin_request");
    if (error) return toast.error(error.message);
    router.refresh();
  }

  return (
    <section className={`${card} space-y-3 p-5`} aria-labelledby="req-admin">
      <h2 id="req-admin" className="flex items-center gap-2 font-display text-xl font-semibold text-heading">
        <ShieldCheck size={20} strokeWidth={1.75} /> Are you a priest or church admin?
      </h2>
      {waiting ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Clock size={18} strokeWidth={1.75} className="text-goldtext" />
          <span className="me-auto">Waiting for approval to manage <b>{waiting}</b>.</span>
          <button onClick={cancel} className={b("secondary")}>Cancel request</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">Ask to be an admin of your church. An admin of that church, or the super admin, will approve you. You can check in as usual in the meantime.</p>
          <Combobox label="Church" value={church} onChange={setChurch} options={options} placeholder="Start typing your church" />
          <button disabled={!church.id || busy} onClick={send} className={b("primary")}>Request admin access</button>
        </>
      )}
    </section>
  );
}
