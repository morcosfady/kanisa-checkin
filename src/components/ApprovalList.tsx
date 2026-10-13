"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { supabaseBrowser } from "@/lib/supabase/client";

type Req = { id: string; full_name: string; email: string | null; created_at: string };

export default function ApprovalList({ initial }: { initial: Req[] }) {
  const t = useTranslations("approvals");
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState("");

  async function decide(id: string, ok: boolean) {
    const db = supabaseBrowser();
    // decline keeps the row (so the first-admin rule cannot trigger again)
    const { error } = ok
      ? await db.from("profiles").update({ approved: true }).eq("id", id)
      : await db.from("profiles").update({ declined_at: new Date().toISOString() }).eq("id", id);
    if (error) return setError(error.message);
    setRows(rows.filter((r) => r.id !== id));
  }

  if (rows.length === 0) return <p>{t("none")}</p>;
  return (
    <ul className="divide-y rounded-lg bg-white shadow">
      {error && <li role="alert" className="p-3 text-red-700">{error}</li>}
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
          <div className="me-auto">
            <div className="font-bold">{r.full_name}</div>
            <div className="text-sm text-ink/70">{r.email}</div>
          </div>
          <button onClick={() => decide(r.id, true)} className="rounded bg-green-700 px-4 py-2 text-white">{t("accept")}</button>
          <button onClick={() => decide(r.id, false)} className="rounded bg-coptic px-4 py-2 text-white">{t("decline")}</button>
        </li>
      ))}
    </ul>
  );
}
