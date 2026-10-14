"use client";
import { useMemo, useState } from "react";
import { Church } from "lucide-react";
import { toast } from "sonner";
import Combobox, { type Choice } from "@/components/Combobox";
import ConfirmDialog from "@/components/members/ConfirmDialog";
import { b, card } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { churchOptions, type ChurchRow, type CityRow } from "@/lib/places";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";

// Shown to an admin who has not chosen their church yet. One time only; services are managed per church.
export default function ChurchGate({ churches, cities }: { churches: ChurchRow[]; cities: CityRow[] }) {
  const router = useRouter();
  const [church, setChurch] = useState<Choice>({ id: null, text: "" });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const options = useMemo(() => churchOptions(churches, cities), [churches, cities]);

  async function save() {
    setConfirm(false);
    setBusy(true);
    if (!hasSupabase) {
      setBusy(false);
      return toast.success("Church saved (demo)");
    }
    const { error } = await supabaseBrowser().rpc("set_my_church", { p_church: church.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Your church is set");
    router.refresh();
  }

  return (
    <div className={`${card} mx-auto max-w-md space-y-4 p-8`}>
      <div className="text-center">
        <Church size={40} strokeWidth={1.5} className="mx-auto text-goldtext" />
        <h2 className="mt-2 font-display text-2xl font-semibold text-heading">Which church do you serve?</h2>
        <p className="mt-1 text-sm text-muted">You will manage services for this church only. You can’t change this later.</p>
      </div>
      <Combobox label="Church" required value={church} onChange={setChurch} options={options} placeholder="Start typing your church" />
      <button disabled={!church.id || busy} onClick={() => setConfirm(true)} className={`${b("primary")} w-full`}>This is my church</button>
      <ConfirmDialog
        open={confirm}
        title="Set your church?"
        body={`You will manage ${church.text}. This can’t be changed later.`}
        confirmLabel="Yes, set it"
        onCancel={() => setConfirm(false)}
        onConfirm={save}
      />
    </div>
  );
}
