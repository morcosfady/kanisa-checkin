"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Cake, Camera, Church, Cross, GraduationCap, Mail, MapPin, MessageSquare, Phone, PhoneCall, Plus, ScanFace, ShieldCheck, ShieldOff, StickyNote, Trash2, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, Badge, b } from "@/components/ui";
import FaceEnroll from "@/components/face/FaceEnroll";
import { resizePhoto } from "@/lib/photo";
import type { Member } from "@/lib/members";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";
import ConfirmDialog from "./ConfirmDialog";
import { FaceIcon, rel, statusTone } from "./MembersView";
import { enrollFor, withdraw } from "./RowMenu";

type Note = { id: string; note: string; created_at: string; author_id: string | null };
type Lab = { id: string; key: string | null; name_en: string; emoji: string; color: string; description: string };
type Held = { id: string; label_id: string };
type Visit = { at: string; late: number; service: string };

const TABS = ["Overview", "Notes", "Attendance", "Consent"] as const;
const STATUSES = ["active", "inactive", "visitor"] as const;
const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function Row({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-line py-3 last:border-0">
      <Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-goldtext" />
      <span className="shrink-0 text-sm text-muted">{label}</span>
      <span className="ms-auto text-end text-sm font-medium">{children}</span>
    </div>
  );
}

function birthday(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob + "T00:00:00");
  const now = new Date();
  const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next.setFullYear(now.getFullYear() + 1);
  const days = Math.round((next.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return { text: d.toLocaleDateString("en-US", { month: "long", day: "numeric" }), days, age };
}

export default function MemberDrawer({ m, all, onClose, onEdit, onChanged, onPatch, onOpenOther }: {
  m: Member; all: Member[]; onClose: () => void; onEdit: () => void; onChanged: () => void; onPatch: (m: Member, p: Partial<Member>) => Promise<void>; onOpenOther: (x: Member) => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [confirm, setConfirm] = useState(false);
  const [enroll, setEnroll] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [labels, setLabels] = useState<Lab[]>([]);
  const [held, setHeld] = useState<Held[]>([]);
  const [pickLabel, setPickLabel] = useState(false);
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bday = birthday(m.dob);
  const family = useMemo(() => (m.familyId ? all.filter((x) => x.familyId === m.familyId && x.id !== m.id && x.family !== "No family") : []), [all, m]);

  useEffect(() => {
    closeBtn.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !confirm && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose, confirm]);

  // real data: notes, labels, attendance (demo mode shows examples)
  const [tick, setTick] = useState(0);
  const [nowTs] = useState(() => Date.now());
  const loadAll = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!hasSupabase) return;
    let off = false;
    (async () => {
      const db = supabaseBrowser();
      const [{ data: auth }, { data: n }, { data: l }, { data: h }, { data: a }] = await Promise.all([
        db.auth.getUser(),
        db.from("pastoral_notes").select("id, note, created_at, author_id").eq("member_id", m.id).order("created_at", { ascending: false }),
        m.churchId ? db.from("labels").select("id, key, name_en, emoji, color, description").eq("church_id", m.churchId).eq("is_active", true).order("sort_order") : Promise.resolve({ data: [] }),
        db.from("member_labels").select("id, label_id").eq("member_id", m.id).is("removed_at", null),
        db.from("attendance").select("checked_in_at, late_minutes, services(name_en)").eq("member_id", m.id).order("checked_in_at", { ascending: false }).limit(120),
      ]);
      if (off) return;
      setMe(auth.user?.id ?? null);
      setNotes((n ?? []) as Note[]);
      setLabels((l ?? []) as Lab[]);
      setHeld((h ?? []) as Held[]);
      setVisits(((a ?? []) as unknown as { checked_in_at: string; late_minutes: number; services: { name_en: string } | null }[]).map((x) => ({ at: x.checked_in_at, late: x.late_minutes, service: x.services?.name_en ?? "Service" })));
    })();
    return () => { off = true; };
  }, [m.id, m.churchId, tick]);

  const noContact = labels.some((l) => l.key === "no_contact" && held.some((x) => x.label_id === l.id));
  const heldLabels = held.map((x) => ({ x, def: labels.find((l) => l.id === x.label_id) })).filter((y): y is { x: Held; def: Lab } => Boolean(y.def));

  async function addNote() {
    const text = draft.trim();
    if (!text) return;
    if (!hasSupabase) {
      setNotes((n) => [{ id: String(Date.now()), note: text, created_at: new Date().toISOString(), author_id: "me" }, ...n]);
      setMe("me");
      setDraft("");
      return void toast.success("Note saved (demo)");
    }
    const { error } = await supabaseBrowser().from("pastoral_notes").insert({ member_id: m.id, author_id: me, note: text });
    if (error) return toast.error(error.message);
    setDraft("");
    toast.success("Note saved");
    loadAll();
    onChanged();
  }
  async function delNote(n: Note) {
    if (!window.confirm("Delete this note?")) return;
    if (!hasSupabase) return setNotes((x) => x.filter((y) => y.id !== n.id));
    const { error } = await supabaseBrowser().from("pastoral_notes").delete().eq("id", n.id);
    if (error) return toast.error(error.message);
    loadAll();
    onChanged();
  }
  async function addLabel(l: Lab) {
    setPickLabel(false);
    if (!hasSupabase) return void toast.success(`${l.name_en} added (demo)`);
    const { error } = await supabaseBrowser().rpc("label_members", { p_members: [m.id], p_label: l.id });
    if (error) return toast.error(error.message);
    loadAll();
  }
  async function dropLabel(l: Lab) {
    if (!hasSupabase) return;
    const { error } = await supabaseBrowser().rpc("unlabel_member", { p_member: m.id, p_label: l.id });
    if (error) return toast.error(error.message);
    loadAll();
  }
  async function pickPhoto(file?: File) {
    if (!file) return;
    try {
      await onPatch(m, { photo: await resizePhoto(file) });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // attendance squares: one per week for the last 52 weeks (real data)
  const weeks = useMemo(() => {
    const now = nowTs;
    const arr = Array.from({ length: 52 }, () => false);
    (visits ?? []).forEach((v) => {
      const w = Math.floor((now - Date.parse(v.at)) / (7 * 86400000));
      if (w >= 0 && w < 52) arr[51 - w] = true;
    });
    return arr;
  }, [visits, nowTs]);

  const btnSm = "inline-flex items-center gap-1.5 rounded-[8px] border border-line px-3 py-1.5 text-xs font-medium hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40";
  const canCall = Boolean(m.phone) && !noContact;
  const canMail = Boolean(m.email) && !noContact;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <motion.aside
        role="dialog" aria-modal="true" aria-label={`${m.name} profile`}
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
        className="fixed inset-y-0 end-0 z-50 flex w-full max-w-md flex-col border-s border-line bg-card shadow-lift"
      >
        <div className="flex items-start gap-4 border-b border-line bg-coptic p-5 text-cream">
          <div className="relative shrink-0">
            <Avatar name={m.name} gender={m.gender} size={64} src={m.photo} />
            <button onClick={() => fileRef.current?.click()} aria-label={m.photo ? "Change photo" : "Add a photo"} title={m.photo ? "Change photo" : "Add a photo"}
              className="absolute -bottom-1 -end-1 grid h-7 w-7 place-items-center rounded-full border border-white/40 bg-coptic hover:bg-white/20"><Camera size={14} /></button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold">{m.name}</h2>
            <p className="text-sm text-cream/75">{m.church || m.city || "Member"}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={statusTone[m.status]}>{m.status[0].toUpperCase() + m.status.slice(1)}</Badge>
              {m.deacon && <span className="inline-flex items-center gap-1 rounded-[12px] bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-cream"><Cross size={12} strokeWidth={2} />Deacon</span>}
              <Badge tone="info">{m.gender === "male" ? "Male" : "Female"}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={onEdit} className="rounded-[8px] border border-white/30 px-3 py-1 text-xs font-medium hover:bg-white/10">Edit member</button>
              {m.photo && <button onClick={() => onPatch(m, { photo: null })} className="rounded-[8px] border border-white/30 px-3 py-1 text-xs font-medium hover:bg-white/10">Remove photo</button>}
            </div>
          </div>
          <button ref={closeBtn} onClick={onClose} aria-label="Close profile" className="grid h-8 w-8 place-items-center rounded-[8px] hover:bg-white/10"><X size={20} /></button>
        </div>

        <div role="tablist" className="flex border-b border-line px-3">
          {TABS.map((t) => (
            <button
              key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`relative px-3 py-3 text-sm font-medium ${tab === t ? "text-heading" : "text-muted"}`}
            >
              {t}{t === "Notes" && notes.length > 0 ? ` (${notes.length})` : ""}
              {tab === t && <motion.span layoutId="drawer-tab" className="absolute inset-x-2 -bottom-px h-0.5 bg-gold" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "Overview" && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2" aria-label="Quick actions">
                <button className={btnSm} aria-pressed={m.deacon} onClick={() => onPatch(m, { deacon: !m.deacon })}>
                  <Cross size={14} /> {m.deacon ? "Remove deacon" : "Make deacon"}
                </button>
                <a className={`${btnSm} ${canCall ? "" : "pointer-events-none opacity-40"}`} href={canCall ? `tel:${m.phone}` : undefined} aria-disabled={!canCall}><PhoneCall size={14} /> Call</a>
                <a className={`${btnSm} ${canCall ? "" : "pointer-events-none opacity-40"}`} href={canCall ? `sms:${m.phone}` : undefined} aria-disabled={!canCall}><MessageSquare size={14} /> Text</a>
                <a className={`${btnSm} ${canMail ? "" : "pointer-events-none opacity-40"}`} href={canMail ? `mailto:${m.email}` : undefined} aria-disabled={!canMail}><Mail size={14} /> Email</a>
              </div>
              {noContact && <p className="text-xs text-muted">🚫 Marked “Do not contact”, so call, text and email are off.</p>}

              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Status</h3>
                <div role="radiogroup" aria-label="Status" className="flex gap-2">
                  {STATUSES.map((s) => (
                    <button key={s} role="radio" aria-checked={m.status === s} onClick={() => m.status !== s && onPatch(m, { status: s })}
                      className={`flex-1 rounded-[12px] border px-3 py-1.5 text-sm font-medium ${m.status === s ? "border-coptic bg-coptic text-white" : "border-line hover:bg-hover"}`}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Labels</h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  {heldLabels.length === 0 && <span className="text-sm text-muted">{hasSupabase ? "No labels." : "Labels show here when connected."}</span>}
                  {heldLabels.map(({ def }) => (
                    <span key={def.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: `${def.color}66`, background: `${def.color}22` }} title={def.description}>
                      {def.emoji} {def.name_en}
                      <button onClick={() => dropLabel(def)} aria-label={`Remove ${def.name_en}`} className="opacity-60 hover:opacity-100"><X size={11} /></button>
                    </span>
                  ))}
                  {hasSupabase && labels.length > 0 && (
                    <span className="relative">
                      <button onClick={() => setPickLabel(!pickLabel)} aria-expanded={pickLabel} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-medium hover:bg-hover"><Plus size={12} /> Label</button>
                      {pickLabel && (
                        <ul className="absolute start-0 top-full z-10 mt-1 max-h-56 w-56 overflow-auto rounded-[12px] border border-line bg-card p-1 shadow-lift">
                          {labels.filter((l) => !held.some((x) => x.label_id === l.id)).map((l) => (
                            <li key={l.id}><button onClick={() => addLabel(l)} className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-start text-sm hover:bg-hover">{l.emoji} {l.name_en}</button></li>
                          ))}
                        </ul>
                      )}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Row icon={Phone} label="Phone">{m.phone || "—"}</Row>
                <Row icon={Mail} label="Email"><span className="break-all">{m.email || "—"}</span></Row>
                <Row icon={Cake} label="Birthday">
                  {bday ? <>{bday.text}{bday.days === 0 ? " 🎂 today" : bday.days <= 14 ? ` · in ${bday.days} days` : ""}<span className="block text-xs font-normal text-muted">Age {bday.age}</span></> : "—"}
                </Row>
                <Row icon={GraduationCap} label="Class / group">{m.className || "—"}</Row>
                <Row icon={MapPin} label="Address">{[m.address, m.apartment, m.city].filter(Boolean).join(", ") || "—"}</Row>
                <Row icon={Church} label="Church">{m.church || "—"}</Row>
                {m.joined && <Row icon={Users} label="Member since">{fmt(m.joined)}</Row>}
              </div>

              {family.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Family · {m.family}</h3>
                  <ul className="flex flex-wrap gap-2">
                    {family.map((f) => (
                      <li key={f.id}><button onClick={() => onOpenOther(f)} className="flex items-center gap-2 rounded-full border border-line py-1 pe-3 ps-1 text-sm hover:bg-hover"><Avatar name={f.name} gender={f.gender} size={24} src={f.photo} />{f.name}</button></li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-center">
                {[["Attendance", m.rate === null ? "—" : `${m.rate}%`], ["Streak", m.streak === null ? "—" : `${m.streak} wks`], ["Last seen", rel(m.lastDays)]].map(([l, v]) => (
                  <div key={l} className="rounded-[12px] bg-page p-3">
                    <div className="num font-display text-lg font-semibold text-heading">{v}</div>
                    <div className="text-xs text-muted">{l}</div>
                  </div>
                ))}
              </div>
              {notes[0] && (
                <button onClick={() => setTab("Notes")} className="flex w-full items-start gap-2 rounded-[12px] border border-gold/40 bg-gold/10 p-3 text-start text-sm">
                  <StickyNote size={16} className="mt-0.5 shrink-0 text-goldtext" /><span className="line-clamp-2">{notes[0].note}</span>
                </button>
              )}
            </div>
          )}

          {tab === "Notes" && (
            <div className="space-y-4">
              <p className="text-sm text-muted">Private notes. Only admins of this church can see them.</p>
              <div className="space-y-2">
                <label className="sr-only" htmlFor="note-draft">New note</label>
                <textarea id="note-draft" value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={1000} placeholder="Write a note, for example a prayer request or a thing to remember…"
                  className="w-full rounded-[8px] border border-line bg-page px-3 py-2 text-sm outline-none focus:border-gold" />
                <button onClick={addNote} disabled={!draft.trim()} className={b("primary")}><StickyNote size={16} /> Add note</button>
              </div>
              {notes.length === 0 ? <p className="py-4 text-center text-sm text-muted">No notes yet.</p> : (
                <ul className="space-y-2">
                  {notes.map((n) => (
                    <li key={n.id} className="rounded-[12px] border border-line p-3">
                      <p className="whitespace-pre-wrap text-sm">{n.note}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                        <span>{n.author_id === me ? "You" : "An admin"} · {fmt(n.created_at)}</span>
                        <button onClick={() => delNote(n)} aria-label="Delete note" className="ms-auto grid h-7 w-7 place-items-center rounded-[8px] text-danger hover:bg-danger-tint"><Trash2 size={14} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "Attendance" && (
            <div className="space-y-5">
              {!hasSupabase ? <p className="text-sm text-muted">Real check-ins show here when the app is connected.</p> : visits === null ? <p className="text-sm text-muted">Loading…</p> : (
                <>
                  <div>
                    <p className="mb-2 text-sm text-muted">Last 12 months. Each square is a week with a check-in.</p>
                    <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5" role="img" aria-label={`${weeks.filter(Boolean).length} of 52 weeks attended`}>
                      {weeks.map((on, i) => <span key={i} className={`aspect-square rounded-[4px] ${on ? "bg-gold" : "bg-line"}`} />)}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Recent check-ins</h3>
                    {visits.length === 0 ? <p className="text-sm text-muted">No check-ins yet.</p> : (
                      <ul className="divide-y divide-line rounded-[12px] border border-line">
                        {visits.slice(0, 12).map((v) => (
                          <li key={v.at} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span>{fmt(v.at)} · {v.service}</span>
                            <span className="num text-muted">{new Date(v.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })}{v.late > 0 ? ` · +${v.late} min` : ""}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "Consent" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-[12px] bg-page p-4">
                {m.consent ? <ShieldCheck className="text-success" /> : <ShieldOff className="text-muted" />}
                <div>
                  <div className="font-medium">{m.consent ? "Face recognition consent given" : "No face consent"}</div>
                  <div className="text-sm text-muted">{m.consent ? `Signed by ${m.signedBy ?? "—"}${m.signedAt ? ` on ${new Date(m.signedAt).toLocaleDateString("en-US")}` : ""}` : "Can still check in by QR or name"}</div>
                </div>
                <span className="ms-auto"><FaceIcon face={m.face} /></span>
              </div>
              {m.consent && (
                <button className={`${b("secondary")} w-full`} onClick={() => setEnroll(true)}>
                  <ScanFace size={18} strokeWidth={1.75} /> {m.face === "enrolled" ? "Re-enroll face" : "Enroll face"}
                </button>
              )}
              {m.consent && (
                <button className={`${b("danger")} w-full border border-danger/30`} onClick={() => setConfirm(true)}>
                  <ShieldOff size={18} strokeWidth={1.75} /> Withdraw consent
                </button>
              )}
            </div>
          )}
        </div>
      </motion.aside>
      <FaceEnroll open={enroll} name={m.name} onClose={() => setEnroll(false)} onDone={(e) => enrollFor(m, e, () => { onChanged(); })} />
      <ConfirmDialog
        open={confirm}
        title="Withdraw face consent?"
        body="Face data is deleted immediately and this is logged."
        confirmLabel="Withdraw consent"
        onCancel={() => setConfirm(false)}
        onConfirm={async () => { setConfirm(false); await withdraw(m, () => { onChanged(); onClose(); }); }}
      />
    </>
  );
}
