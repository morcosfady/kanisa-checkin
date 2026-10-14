"use client";
import { useState } from "react";
import { BellRing, Cake, PartyPopper, PhoneCall, Home, Sprout, X } from "lucide-react";
import { lastSeenText, type LabelDef, type Row, type Sheet } from "@/lib/attendance/calc";
import type { LabelActions } from "./Labels";
import { LAvatar } from "./ledger-ui";

function Block({ title, icon: Icon, count, children }: { title: string; icon: typeof BellRing; count: number; children: React.ReactNode }) {
  return (
    <section className="l-card p-4" aria-label={title}>
      <h3 className="l-h mb-2 flex items-center gap-2 text-base"><Icon size={17} className="l-gold" /> {title} <span className="l-mute ms-auto text-sm font-normal">{count}</span></h3>
      {children}
    </section>
  );
}

function Snooze({ onPick }: { onPick: (days: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="l-chip !min-h-7 !px-2 !py-0.5 text-xs">Snooze</button>
      {open && (
        <span className="l-pop absolute end-0 top-full z-20 mt-1 grid w-32 p-1">
          {([[7, "1 week"], [14, "2 weeks"], [30, "1 month"]] as const).map(([d, l]) => (
            <button key={d} onClick={() => { setOpen(false); onPick(d); }} className="rounded-lg px-2 py-1.5 text-start text-sm hover:bg-[var(--l-hover)]">{l}</button>
          ))}
        </span>
      )}
    </span>
  );
}

export default function NeedsAttention({ sheet, defs, today, canEdit, actions, onOpen }: { sheet: Sheet; defs: LabelDef[]; today: string; canEdit: boolean; actions: LabelActions; onOpen: (r: Row) => void }) {
  const byKey = (k: string) => defs.find((d) => d.key === k);
  const called = byKey("called"), visited = byKey("visited"), followup = byKey("followup");
  const need = sheet.rows.filter((r) => r.followup).sort((a, b) => a.streak - b.streak || (a.lastAttended ?? "").localeCompare(b.lastAttended ?? ""));
  const empty = (t: string) => <p className="l-mute py-2 text-sm">{t}</p>;

  return (
    <div className="space-y-4">
      <Block title="Follow up needed" icon={BellRing} count={need.length}>
        {need.length === 0 ? empty("Nobody needs a call right now 🙏") : (
          <ul className="max-h-[26rem] space-y-1 overflow-auto">
            {need.slice(0, 30).map((r) => (
              <li key={r.id} className="rounded-xl p-2 hover:bg-[var(--l-hover)]">
                <button onClick={() => onOpen(r)} className="flex w-full items-center gap-2 text-start">
                  <LAvatar name={r.name} gender={r.gender} size={32} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{r.name}</span>
                    <span className="block text-xs" style={{ color: "var(--t-absent)" }}>{r.streak <= -2 ? `Missed ${-r.streak} in a row · ` : ""}{lastSeenText(r.lastAttended, today, r.joined)}</span></span>
                </button>
                {canEdit && (
                  <div className="mt-1 flex flex-wrap gap-1 ps-10">
                    {called && <button onClick={() => actions.add([r.id], called.id)} className="l-chip !min-h-7 !px-2 !py-0.5 text-xs"><PhoneCall size={12} /> Called</button>}
                    {visited && <button onClick={() => actions.add([r.id], visited.id)} className="l-chip !min-h-7 !px-2 !py-0.5 text-xs"><Home size={12} /> Visited</button>}
                    <Snooze onPick={(d) => actions.snooze(r.id, d)} />
                    {followup && <button onClick={() => actions.remove(r.id, followup.id)} aria-label={`Remove follow-up label from ${r.name}`} className="l-chip !min-h-7 !px-2 !py-0.5 text-xs"><X size={12} /> Remove</button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Welcome back 🎉" icon={PartyPopper} count={sheet.welcomeBack.length}>
        {sheet.welcomeBack.length === 0 ? empty("No one returned lately.") : (
          <ul className="space-y-1">{sheet.welcomeBack.map((r) => (
            <li key={r.id}><button onClick={() => onOpen(r)} className="flex w-full items-center gap-2 rounded-xl p-2 text-start hover:bg-[var(--l-hover)]"><LAvatar name={r.name} gender={r.gender} size={28} /><span className="text-sm font-medium">{r.name}</span><span className="l-mute ms-auto text-xs">{lastSeenText(r.lastAttended, today, r.joined)}</span></button></li>
          ))}</ul>
        )}
      </Block>

      <Block title="New this period 🌱" icon={Sprout} count={sheet.newcomers.length}>
        {sheet.newcomers.length === 0 ? empty("No new faces yet.") : (
          <ul className="space-y-1">{sheet.newcomers.slice(0, 8).map((r) => (
            <li key={r.id}><button onClick={() => onOpen(r)} className="flex w-full items-center gap-2 rounded-xl p-2 text-start hover:bg-[var(--l-hover)]"><LAvatar name={r.name} gender={r.gender} size={28} /><span className="text-sm font-medium">{r.name}</span><span className="l-mute ms-auto text-xs">joined {new Date(r.joined + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span></button></li>
          ))}</ul>
        )}
      </Block>

      <Block title="Birthdays this week 🎂" icon={Cake} count={sheet.birthdays.length}>
        {sheet.birthdays.length === 0 ? empty("No birthdays in the next 7 days.") : (
          <ul className="space-y-1">{sheet.birthdays.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-xl p-2"><LAvatar name={r.name} gender={r.gender} size={28} /><span className="text-sm font-medium">{r.name}</span><span className="l-mute ms-auto text-xs">{new Date("2000-" + r.dob!.slice(5) + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span></li>
          ))}</ul>
        )}
      </Block>
    </div>
  );
}
