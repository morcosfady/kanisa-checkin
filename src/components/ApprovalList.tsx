"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, PartyPopper, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Badge, b, card } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";

export type AdminRequest = { id: string; name: string; email: string | null; church: string };

// People asking to become an admin of a church. Regular users never show up here.
export default function ApprovalList({ initial }: { initial: AdminRequest[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const list = hasSupabase ? initial : rows;

  async function decide(r: AdminRequest, ok: boolean) {
    if (hasSupabase) {
      const { error } = await supabaseBrowser().rpc(ok ? "approve_admin" : "decline_admin", { p_user: r.id });
      if (error) return toast.error(error.message);
      if (ok && r.email) {
        fetch("/api/admin-email", { method: "POST", body: JSON.stringify({ to: r.email, kind: "approved" }) })
          .then((x) => x.json())
          .then((j) => j.sent && toast.success(`Email sent to ${r.name} ✉️`))
          .catch(() => {});
      }
      router.refresh();
    } else {
      setRows((x) => x.filter((y) => y.id !== r.id));
    }
    toast.success(ok ? `${r.name} is now an admin of ${r.church}` : `${r.name} declined`);
  }

  if (list.length === 0) {
    return (
      <div className={`${card} grid place-items-center gap-2 p-12 text-center`}>
        <PartyPopper size={40} strokeWidth={1.5} className="text-goldtext" />
        <p className="font-display text-xl font-semibold text-heading">All caught up ✨</p>
        <p className="text-muted">No admin requests.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      <AnimatePresence initial={false}>
        {list.map((r, i) => (
          <motion.li
            key={r.id}
            layout
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
            transition={{ delay: i * 0.04 }}
            className={`${card} flex flex-wrap items-center gap-4 p-4`}
          >
            <Avatar name={r.name} size={44} />
            <div className="me-auto min-w-0">
              <div className="font-semibold">{r.name}</div>
              <div className="truncate text-sm text-muted">{r.email}</div>
              <div className="mt-1"><Badge tone="gold">Wants to manage {r.church}</Badge></div>
            </div>
            <button onClick={() => decide(r, false)} className={b("danger")}><X size={18} strokeWidth={1.75} /> Decline</button>
            <button onClick={() => decide(r, true)} className={b("primary")}><Check size={18} strokeWidth={1.75} /> Approve</button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
