"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Church, Download, LayoutGrid, List, Plus, ScanFace, Search,
  Upload, UserCheck, Users, UsersRound, X, Cross, Check, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, Badge, CountUp, b, card } from "@/components/ui";
import type { FamilyOption, Member } from "@/lib/members";
import type { ChurchRow, CityRow } from "@/lib/places";
import { useRouter } from "@/i18n/navigation";
import { hasSupabase } from "@/lib/supabase/env";
import MemberForm from "./MemberForm";
import MemberDrawer from "./MemberDrawer";
import RowMenu from "./RowMenu";

const PAGE = 10;
type View = "table" | "cards" | "families";
type Sort = "name" | "family" | "last" | "rate";

export const rel = (d: number | null) => (d === null ? "Never" : d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`);

export function FaceIcon({ face }: { face: Member["face"] }) {
  const map = {
    enrolled: { Icon: Check, cls: "text-success", tip: "Face enrolled" },
    pending: { Icon: AlertCircle, cls: "text-warning", tip: "Consent given, face not enrolled yet" },
    none: { Icon: X, cls: "text-muted", tip: "No face consent" },
  }[face];
  return (
    <span role="img" title={map.tip} aria-label={map.tip} className={`inline-flex items-center gap-0.5 ${map.cls}`}>
      <ScanFace size={18} strokeWidth={1.75} />
      <map.Icon size={12} strokeWidth={2.5} />
    </span>
  );
}

export const statusTone = { active: "success", inactive: "gray", visitor: "gold" } as const;

function Spark({ pts }: { pts: number[] }) {
  if (pts.length < 2) return null;
  const max = Math.max(...pts), min = Math.min(...pts);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * 60},${22 - ((p - min) / (max - min || 1)) * 20}`).join(" ");
  return (
    <svg width="60" height="24" aria-hidden className="text-gold-dark">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-[12px] border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] ${
        on ? "border-coptic bg-coptic text-white" : "border-line bg-card text-ink hover:bg-hover"
      }`}
    >
      {children}
    </button>
  );
}

export default function MembersView({ initial, families, cities, churches }: { initial: Member[]; families: FamilyOption[]; cities: CityRow[]; churches: ChurchRow[] }) {
  const router = useRouter();
  // demo mode keeps changes in memory; real mode refreshes from the server
  const [local, setLocal] = useState<Member[]>([]);
  const [edits, setEdits] = useState<Record<string, Member>>({});
  const all = useMemo(() => [...initial.map((m) => edits[m.id] ?? m), ...local], [initial, local, edits]);
  const [form, setForm] = useState<{ open: boolean; member: Member | null }>({ open: false, member: null });
  const [q, setQ] = useState("");
  const [gender, setGender] = useState<"all" | "male" | "female">("all");
  const [deacon, setDeacon] = useState(false);
  const [status, setStatus] = useState<"all" | Member["status"]>("all");
  const [consent, setConsent] = useState<"all" | "yes" | "no">("all");
  const [view, setView] = useState<View>("table");
  const [sort, setSort] = useState<Sort>("name");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Member | null>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const filters = (gender !== "all" ? 1 : 0) + (deacon ? 1 : 0) + (status !== "all" ? 1 : 0) + (consent !== "all" ? 1 : 0);
  const clear = () => { setGender("all"); setDeacon(false); setStatus("all"); setConsent("all"); setQ(""); setPage(0); };

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = all.filter(
      (m) =>
        (!t || m.name.toLowerCase().includes(t) || m.family.toLowerCase().includes(t) || m.phone.includes(t)) &&
        (gender === "all" || m.gender === gender) &&
        (!deacon || m.deacon) &&
        (status === "all" || m.status === status) &&
        (consent === "all" || (consent === "yes") === m.consent),
    );
    const cmp: Record<Sort, (a: Member, c: Member) => number> = {
      name: (a, c) => a.name.localeCompare(c.name),
      family: (a, c) => a.family.localeCompare(c.family) || a.name.localeCompare(c.name),
      last: (a, c) => (a.lastDays ?? 9999) - (c.lastDays ?? 9999),
      rate: (a, c) => (c.rate ?? -1) - (a.rate ?? -1),
    };
    return list.sort(cmp[sort]);
  }, [all, q, gender, deacon, status, consent, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = rows.slice(cur * PAGE, cur * PAGE + PAGE);
  const familyCount = new Set(all.filter((m) => m.family !== "No family").map((m) => m.family)).size;
  const enrolledPct = all.length ? Math.round((all.filter((m) => m.face === "enrolled").length / all.length) * 100) : 0;
  const demoSpark = !hasSupabase;
  const stats = [
    { label: "Total members", value: all.length, icon: Users, spark: demoSpark ? [18, 19, 20, 21, 22, 23, 24] : [] },
    { label: "Active", value: all.filter((m) => m.status === "active").length, icon: UserCheck, spark: demoSpark ? [15, 16, 18, 17, 19, 20, 20] : [] },
    { label: "Visitors this month", value: all.filter((m) => m.status === "visitor").length, icon: UsersRound, spark: demoSpark ? [0, 1, 1, 2, 1, 2, 2] : [] },
    { label: "Face check-in enabled", value: enrolledPct, suffix: "%", icon: ScanFace, spark: demoSpark ? [30, 38, 41, 47, 52, 55, enrolledPct] : [] },
  ];

  const byFamily = useMemo(() => {
    const g = new Map<string, Member[]>();
    rows.forEach((m) => g.set(m.family, [...(g.get(m.family) ?? []), m]));
    return [...g.entries()];
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="me-auto">
          <h1 className="font-display text-3xl font-semibold text-heading">Members</h1>
          <p className="text-muted num">{all.length} people in {familyCount} families</p>
        </div>
        <button className={b("secondary")} onClick={() => toast("Import is coming soon")}><Upload size={18} strokeWidth={1.75} /> Import</button>
        <button className={b("secondary")} onClick={() => toast("Export (Excel / PDF) is coming soon")}><Download size={18} strokeWidth={1.75} /> Export</button>
        <button className={b("primary")} onClick={() => setForm({ open: true, member: null })}><Plus size={18} strokeWidth={1.75} /> Add member</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            whileHover={{ y: -2 }}
            className={`${card} flex items-center gap-4 p-4 transition-shadow hover:shadow-lift`}
          >
            <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-gold/20 text-goldtext"><s.icon size={20} strokeWidth={1.75} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-muted">{s.label}</div>
              <div className="font-display text-3xl font-semibold text-heading"><CountUp value={s.value} suffix={s.suffix} /></div>
            </div>
            <Spark pts={s.spark} />
          </motion.div>
        ))}
      </div>

      <div className={`${card} space-y-4 p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-60 flex-1">
            <span className="sr-only">Search members</span>
            <Search size={18} strokeWidth={1.75} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={search}
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="Search name, family or phone"
              className="w-full rounded-[8px] border border-line bg-page py-2 ps-10 pe-16 text-sm outline-none focus:border-gold"
            />
            <kbd className="absolute end-3 top-1/2 -translate-y-1/2 rounded border border-line bg-card px-1.5 text-[11px] text-muted">Ctrl K</kbd>
          </label>
          <label className="text-sm">
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-[8px] border border-line bg-page px-3 py-2 text-sm">
              <option value="name">Sort: Name</option>
              <option value="family">Sort: Family</option>
              <option value="last">Sort: Last attended</option>
              <option value="rate">Sort: Attendance rate</option>
            </select>
          </label>
          <div className="flex overflow-hidden rounded-[12px] border border-line" role="group" aria-label="View">
            {([["table", List, "Table"], ["cards", LayoutGrid, "Cards"], ["families", Church, "Families"]] as const).map(([v, Icon, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                aria-label={`${label} view`}
                title={`${label} view`}
                className={`grid h-9 w-10 place-items-center transition ${view === v ? "bg-coptic text-white" : "bg-card hover:bg-hover"}`}
              >
                <Icon size={18} strokeWidth={1.75} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip on={gender === "male"} onClick={() => { setGender(gender === "male" ? "all" : "male"); setPage(0); }}>Male</Chip>
          <Chip on={gender === "female"} onClick={() => { setGender(gender === "female" ? "all" : "female"); setPage(0); }}>Female</Chip>
          <Chip on={deacon} onClick={() => { setDeacon(!deacon); setPage(0); }}>Deacon</Chip>
          <span className="mx-1 h-5 w-px bg-line" />
          {(["active", "inactive", "visitor"] as const).map((s) => (
            <Chip key={s} on={status === s} onClick={() => { setStatus(status === s ? "all" : s); setPage(0); }}>
              {s[0].toUpperCase() + s.slice(1)}
            </Chip>
          ))}
          <span className="mx-1 h-5 w-px bg-line" />
          <Chip on={consent === "yes"} onClick={() => { setConsent(consent === "yes" ? "all" : "yes"); setPage(0); }}>Face consent</Chip>
          <Chip on={consent === "no"} onClick={() => { setConsent(consent === "no" ? "all" : "no"); setPage(0); }}>No consent</Chip>
          {(filters > 0 || q) && (
            <button onClick={clear} className="ms-auto text-sm font-medium text-heading underline underline-offset-4">
              Clear {filters > 0 ? `(${filters})` : ""}
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={`${card} grid place-items-center gap-3 p-12 text-center`}>
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" stroke="var(--gold-500)" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="36" cy="36" r="32" /><path d="M36 18v36M18 36h36" /><circle cx="36" cy="16" r="3" /><circle cx="36" cy="56" r="3" /><circle cx="16" cy="36" r="3" /><circle cx="56" cy="36" r="3" />
          </svg>
          <p className="font-display text-xl text-heading">No members match your filters</p>
          <button onClick={clear} className={b("secondary")}>Clear filters</button>
        </div>
      ) : view === "table" ? (
        <>
        <div className="grid gap-3 sm:hidden">
          {slice.map((m) => <MemberCard key={m.id} m={m} onOpen={setOpen} />)}
          <div className="flex items-center justify-between text-sm text-muted">
            <button className={b("secondary")} disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
            <span className="num">{cur + 1} / {pages}</span>
            <button className={b("secondary")} disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className={`${card} hidden overflow-hidden sm:block`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="sticky top-0 bg-page/80 text-start text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="p-3 text-start font-semibold">Member</th>
                  <th className="p-3 text-start font-semibold">Status</th>
                  <th className="p-3 text-start font-semibold">Face</th>
                  <th className="p-3 text-start font-semibold">Last attended</th>
                  <th className="p-3 text-start font-semibold">Attendance</th>
                  <th className="p-3 text-start font-semibold">Streak</th>
                  <th className="p-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {slice.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025, duration: 0.2 }}
                    onClick={() => setOpen(m)}
                    className="cursor-pointer border-t border-line transition-colors even:bg-page/40 hover:bg-hover"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} gender={m.gender} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 font-medium">
                            {m.name}
                            {m.deacon && <Badge tone="gold" icon={<Cross size={12} strokeWidth={2} />}>Deacon</Badge>}
                          </div>
                          <div className="text-xs text-muted">{m.family} family</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3"><Badge tone={statusTone[m.status]}>{m.status[0].toUpperCase() + m.status.slice(1)}</Badge></td>
                    <td className="p-3"><FaceIcon face={m.face} /></td>
                    <td className="p-3 text-muted">{rel(m.lastDays)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-line" role="img" aria-label={m.rate === null ? "No data yet" : `${m.rate} percent`}>
                          <div className="h-full rounded-full bg-gold" style={{ width: `${m.rate ?? 0}%` }} />
                        </div>
                        <span className="num text-xs text-muted">{m.rate === null ? "—" : `${m.rate}%`}</span>
                      </div>
                    </td>
                    <td className="p-3 num">{m.streak === null ? "—" : <>{m.streak} <span className="text-muted">wks</span></>}</td>
                    <td className="p-3 text-end" onClick={(e) => e.stopPropagation()}><RowMenu m={m} onView={() => setOpen(m)} onEdit={() => setForm({ open: true, member: m })} onChanged={() => router.refresh()} /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-line p-3 text-sm text-muted">
            <span className="num">{cur * PAGE + 1}–{Math.min(rows.length, cur * PAGE + PAGE)} of {rows.length}</span>
            <div className="flex items-center gap-1">
              <button className={b("ghost")} disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
              <span className="num px-2">{cur + 1} / {pages}</span>
              <button className={b("ghost")} disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
            </div>
          </div>
        </div>
        </>
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((m, i) => <MemberCard key={m.id} m={m} onOpen={setOpen} delay={Math.min(i, 14) * 0.025} />)}
        </div>
      ) : (
        <div className="space-y-3">
          {byFamily.map(([fam, list]) => <FamilyCard key={fam} fam={fam} list={list} onOpen={setOpen} />)}
        </div>
      )}

      <AnimatePresence>
        {open && <MemberDrawer m={open} onClose={() => setOpen(null)} onEdit={() => { setForm({ open: true, member: open }); setOpen(null); }} onChanged={() => router.refresh()} />}
      </AnimatePresence>
      <MemberForm
        open={form.open}
        member={form.member}
        families={families}
        cities={cities}
        churches={churches}
        onClose={() => setForm({ open: false, member: null })}
        onSaved={(m) => {
          if (hasSupabase) return router.refresh();
          if (form.member) setEdits((e) => ({ ...e, [m.id]: m }));
          else setLocal((l) => [...l, m]);
        }}
      />
    </div>
  );
}

function MemberCard({ m, onOpen, delay = 0 }: { m: Member; onOpen: (m: Member) => void; delay?: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }}
      onClick={() => onOpen(m)}
      className={`${card} flex flex-col items-start gap-3 p-4 text-start transition-shadow hover:shadow-lift`}
    >
      <div className="flex w-full items-center gap-3">
        <Avatar name={m.name} gender={m.gender} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{m.name}</div>
          <div className="text-xs text-muted">{m.family} family</div>
        </div>
        <Ring pct={m.rate ?? 0} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={statusTone[m.status]}>{m.status[0].toUpperCase() + m.status.slice(1)}</Badge>
        {m.deacon && <Badge tone="gold" icon={<Cross size={12} strokeWidth={2} />}>Deacon</Badge>}
      </div>
      <div className="flex w-full items-center justify-between text-xs text-muted">
        <span>Last: {rel(m.lastDays)}</span><FaceIcon face={m.face} />
      </div>
    </motion.button>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 16, c = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" role="img" aria-label={`${pct} percent attendance`}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--gold-500)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 20 20)" />
      <text x="20" y="24" textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor" className="num">{pct}</text>
    </svg>
  );
}

function FamilyCard({ fam, list, onOpen }: { fam: string; list: Member[]; onOpen: (m: Member) => void }) {
  const [open, setOpen] = useState(true);
  const rates = list.filter((m) => m.rate !== null);
  const avg = rates.length ? Math.round(rates.reduce((s, m) => s + (m.rate ?? 0), 0) / rates.length) : null;
  return (
    <div className={card}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-start">
        <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-gold/20 text-goldtext"><Church size={20} strokeWidth={1.75} /></span>
        <div className="me-auto">
          <div className="font-display text-lg font-semibold text-heading">{fam} family</div>
          <div className="text-sm text-muted num">{list.length} members</div>
        </div>
        <div className="text-end text-sm"><span className="num font-semibold">{avg === null ? "—" : `${avg}%`}</span> <span className="text-muted">attendance</span></div>
        <ChevronRight size={18} className={`transition ${open ? "rotate-90" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <ul className="divide-y divide-line border-t border-line">
              {list.map((m) => (
                <li key={m.id}>
                  <button onClick={() => onOpen(m)} className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-hover">
                    <Avatar name={m.name} gender={m.gender} />
                    <span className="me-auto font-medium">{m.name}</span>
                    {m.deacon && <Badge tone="gold" icon={<Cross size={12} strokeWidth={2} />}>Deacon</Badge>}
                    <span className="num text-sm text-muted">{m.rate === null ? "—" : `${m.rate}%`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
