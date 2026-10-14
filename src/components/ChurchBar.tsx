"use client";
import { createContext, useContext, useMemo, useState } from "react";
import { Church } from "lucide-react";
import { toast } from "sonner";
import Combobox, { type Choice } from "@/components/Combobox";
import { b } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { churchOptions, type ChurchRow, type CityRow } from "@/lib/places";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";

// Tells the admin pages whether the signed-in person is the super admin (who can switch churches)
const SuperContext = createContext(false);
export const useIsSuper = () => useContext(SuperContext);

export function SuperProvider({ isSuper, children }: { isSuper: boolean; children: React.ReactNode }) {
  return <SuperContext.Provider value={isSuper}>{children}</SuperContext.Provider>;
}

// Super admin only: pick which church you are managing right now
export default function ChurchBar({ current, churches, cities }: { current: string; churches: ChurchRow[]; cities: CityRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pick, setPick] = useState<Choice>({ id: null, text: "" });
  const [busy, setBusy] = useState(false);
  const options = useMemo(() => churchOptions(churches, cities), [churches, cities]);

  async function save() {
    if (!pick.id) return;
    setBusy(true);
    if (!hasSupabase) {
      setBusy(false);
      setEditing(false);
      return toast.success("Church switched (demo)");
    }
    const { error } = await supabaseBrowser().rpc("set_my_church", { p_church: pick.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Now managing ${pick.text}`);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="mx-auto mb-5 flex max-w-5xl flex-wrap items-center gap-3 rounded-[12px] border border-line bg-card px-4 py-2.5 text-sm">
      <Church size={18} strokeWidth={1.75} className="text-goldtext" />
      {editing ? (
        <>
          <div className="min-w-60 flex-1">
            <Combobox label="Church" value={pick} onChange={setPick} options={options} placeholder="Start typing a church" />
          </div>
          <button disabled={!pick.id || busy} onClick={save} className={b("primary")}>Switch</button>
          <button onClick={() => setEditing(false)} className={b("ghost")}>Cancel</button>
        </>
      ) : (
        <>
          <span className="me-auto">Managing: <b className="text-heading">{current || "no church chosen yet"}</b></span>
          <button onClick={() => setEditing(true)} className={b("ghost")}>Switch church</button>
        </>
      )}
    </div>
  );
}
