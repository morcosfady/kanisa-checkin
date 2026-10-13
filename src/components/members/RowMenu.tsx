"use client";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Eye, Pencil, CheckCircle2, ScanFace, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import type { Member } from "@/lib/members";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";
import ConfirmDialog from "./ConfirmDialog";

// Deletes the face data now and logs it (database function); demo mode only shows a message
export async function withdraw(m: Member, done: () => void) {
  if (!hasSupabase) return toast.success(`Consent withdrawn for ${m.name} (demo)`);
  const { error } = await supabaseBrowser().rpc("withdraw_consent", { p_member: m.id });
  if (error) return toast.error(error.message);
  toast.success(`Consent withdrawn for ${m.name}`);
  done();
}

export default function RowMenu({ m, onView, onEdit, onChanged }: { m: Member; onView: () => void; onEdit: () => void; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const away = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, []);

  const item = "flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-sm hover:bg-hover";
  const act = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label={`Actions for ${m.name}`} className="grid h-8 w-8 place-items-center rounded-[8px] hover:bg-hover">
        <MoreHorizontal size={18} strokeWidth={1.75} />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 z-30 mt-1 w-56 rounded-[12px] border border-line bg-card p-1 text-start shadow-lift">
          <button role="menuitem" className={item} onClick={act(onView)}><Eye size={18} strokeWidth={1.75} /> View profile</button>
          <button role="menuitem" className={item} onClick={act(onEdit)}><Pencil size={18} strokeWidth={1.75} /> Edit</button>
          <button role="menuitem" className={item} onClick={act(() => toast.success(`${m.name} checked in manually`))}><CheckCircle2 size={18} strokeWidth={1.75} /> Check in manually</button>
          <button role="menuitem" className={item} onClick={act(() => toast(`Face enrollment for ${m.name} is coming soon`))}><ScanFace size={18} strokeWidth={1.75} /> Enroll face</button>
          {m.consent && (
            <button role="menuitem" className={`${item} text-danger`} onClick={act(() => setConfirm(true))}><ShieldOff size={18} strokeWidth={1.75} /> Withdraw consent</button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        title="Withdraw face consent?"
        body={`${m.name}'s face data will be deleted immediately and this is logged. They can still check in by QR or name.`}
        confirmLabel="Withdraw consent"
        onCancel={() => setConfirm(false)}
        onConfirm={async () => { setConfirm(false); await withdraw(m, onChanged); }}
      />
    </div>
  );
}
