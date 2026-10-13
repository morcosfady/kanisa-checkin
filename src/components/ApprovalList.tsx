"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, PartyPopper, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, b, card } from "@/components/ui";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";

type Req = { id: string; full_name: string; email: string | null; created_at: string };

export default function ApprovalList({ initial }: { initial: Req[] }) {
  const [rows, setRows] = useState(initial);

  async function decide(r: Req, ok: boolean) {
    if (hasSupabase) {
      const db = supabaseBrowser();
      // decline keeps the row (so the first-admin rule cannot trigger again)
      const { error } = ok
        ? await db.from("profiles").update({ approved: true }).eq("id", r.id)
        : await db.from("profiles").update({ declined_at: new Date().toISOString() }).eq("id", r.id);
      if (error) return toast.error(error.message);
    }
    setRows((x) => x.filter((y) => y.id !== r.id));
    toast.success(ok ? `${r.full_name} approved` : `${r.full_name} declined`);
  }

  if (rows.length === 0) {
    return (
      <div className={`${card} grid place-items-center gap-2 p-12 text-center`}>
        <PartyPopper size={40} strokeWidth={1.5} className="text-goldtext" />
        <p className="font-display text-xl font-semibold text-heading">All caught up ✨</p>
        <p className="text-muted">No pending requests.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      <AnimatePresence initial={false}>
        {rows.map((r, i) => (
          <motion.li
            key={r.id}
            layout
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
            transition={{ delay: i * 0.04 }}
            className={`${card} flex flex-wrap items-center gap-4 p-4`}
          >
            <Avatar name={r.full_name} size={44} />
            <div className="me-auto min-w-0">
              <div className="font-semibold">{r.full_name}</div>
              <div className="truncate text-sm text-muted">{r.email}</div>
            </div>
            <button onClick={() => decide(r, false)} className={b("danger")}><X size={18} strokeWidth={1.75} /> Reject</button>
            <button onClick={() => decide(r, true)} className={b("primary")}><Check size={18} strokeWidth={1.75} /> Approve</button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
