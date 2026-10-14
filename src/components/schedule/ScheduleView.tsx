"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, b, card } from "@/components/ui";
import ConfirmDialog from "@/components/members/ConfirmDialog";
import { useRouter } from "@/i18n/navigation";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Template = { id: string; name: string; type: string; weekday: number; start: string; end: string | null; active: boolean };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TYPES: [string, string][] = [
  ["mass", "Divine Liturgy"], ["vespers", "Vespers"], ["bible_study", "Bible Study"],
  ["youth_meeting", "Youth Meeting"], ["sunday_school", "Sunday School"], ["feast", "Feast"], ["other", "Other"],
];

const t12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const field = "mt-1 w-full rounded-[8px] border border-line bg-page px-3 py-2.5 text-sm outline-none focus:border-gold";

export default function ScheduleView({ initial }: { initial: Template[] }) {
  const router = useRouter();
  const [local, setLocal] = useState<Template[]>(initial);
  const [type, setType] = useState("mass");
  const [name, setName] = useState("Divine Liturgy");
  const [weekday, setWeekday] = useState(0);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("12:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [del, setDel] = useState<Template | null>(null);

  const items = hasSupabase ? initial : local;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Give the event a name.");
    if (end && end <= start) return setError("The end time must be after the start time.");
    setBusy(true);
    if (!hasSupabase) {
      setLocal((l) => [...l, { id: `t${Date.now()}`, name: name.trim(), type, weekday, start, end: end || null, active: true }]);
      setBusy(false);
      return toast.success("Weekly event added (demo)");
    }
    const { error: err } = await supabaseBrowser().from("service_templates").insert({
      name_ar: name.trim(), name_en: name.trim(), type, weekday, start_time: start, end_time: end || null, active: true,
    });
    setBusy(false);
    if (err) return setError(err.message);
    toast.success(`${name.trim()} will open check-in every ${DAYS[weekday]}`);
    router.refresh();
  }

  async function toggle(t: Template) {
    if (!hasSupabase) return setLocal((l) => l.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x)));
    const { error: err } = await supabaseBrowser().from("service_templates").update({ active: !t.active }).eq("id", t.id);
    if (err) return toast.error(err.message);
    router.refresh();
  }

  async function remove(t: Template) {
    setDel(null);
    if (!hasSupabase) return setLocal((l) => l.filter((x) => x.id !== t.id));
    const { error: err } = await supabaseBrowser().from("service_templates").delete().eq("id", t.id);
    if (err) return toast.error(err.message);
    toast.success(`${t.name} removed`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-heading">Weekly events</h1>
        <p className="text-muted">Check-in opens and closes by itself during these times. No need to press Start each week.</p>
      </div>

      <section className="space-y-3" aria-label="Scheduled events">
        {items.length === 0 && (
          <div className={`${card} grid place-items-center gap-2 p-10 text-center`}>
            <CalendarDays size={40} strokeWidth={1.5} className="text-goldtext" />
            <p className="text-muted">No weekly events yet. Add one below.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id} layout
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }}
              className={`${card} flex flex-wrap items-center gap-4 p-4 ${t.active ? "" : "opacity-60"}`}
            >
              <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-gold/20 text-goldtext"><CalendarDays size={22} strokeWidth={1.75} /></span>
              <div className="me-auto min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-semibold">
                  {t.name}
                  <Badge tone={t.active ? "success" : "gray"}>{t.active ? "On" : "Paused"}</Badge>
                </div>
                <div className="text-sm text-muted">
                  Every {DAYS[t.weekday]} · <span className="num">{t12(t.start)}{t.end ? ` – ${t12(t.end)}` : ""}</span>
                </div>
              </div>
              <button onClick={() => toggle(t)} role="switch" aria-checked={t.active} aria-label={`${t.active ? "Pause" : "Turn on"} ${t.name}`}
                className={`relative h-7 w-12 rounded-full transition ${t.active ? "bg-success" : "bg-line"}`}>
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${t.active ? "start-[1.4rem]" : "start-0.5"}`} />
              </button>
              <button onClick={() => setDel(t)} aria-label={`Delete ${t.name}`} className="grid h-9 w-9 place-items-center rounded-[8px] text-danger hover:bg-danger-tint">
                <Trash2 size={18} strokeWidth={1.75} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </section>

      <form onSubmit={add} className={`${card} space-y-4 p-5`}>
        <h2 className="font-display text-xl font-semibold text-heading">Add a weekly event</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Type
            <select value={type} onChange={(e) => { setType(e.target.value); setName(TYPES.find((x) => x[0] === e.target.value)![1]); }} className={field}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Name
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </label>
          <label className="text-sm font-medium">Day of the week
            <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className={field}>
              {DAYS.map((d, i) => <option key={d} value={i}>Every {d}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">Starts
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} required className={field} />
            </label>
            <label className="text-sm font-medium">Ends
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={field} />
            </label>
          </div>
        </div>
        {error && <p role="alert" className="rounded-[8px] bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end">
          <button disabled={busy} className={b("primary")}><Plus size={18} strokeWidth={1.75} /> {busy ? "Adding…" : "Add event"}</button>
        </div>
      </form>

      <ConfirmDialog
        open={Boolean(del)}
        title="Delete this weekly event?"
        body="Check-in will no longer open by itself for it. Past check-ins are kept."
        confirmLabel="Delete"
        onCancel={() => setDel(null)}
        onConfirm={() => del && remove(del)}
      />
    </div>
  );
}
