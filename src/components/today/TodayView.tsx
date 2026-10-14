"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, Clock, Cross, Hand, QrCode, ScanFace, Smartphone, Square, UserCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Badge, CountUp, b, card } from "@/components/ui";
import { fmtTime } from "@/lib/demo";
import { METHOD_LABEL } from "@/lib/checkin";
import { useRouter } from "@/i18n/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export type TodayMember = { id: string; name: string; gender: string; deacon: boolean; status: string };
export type Arrival = { memberId: string; min: number; method: string; late: boolean; fresh?: boolean };
export type TodayService = { id: string | null; name: string; whenLabel: string; startMin: number; graceMin: number };

const METHOD_ICON: Record<string, typeof ScanFace> = { face: ScanFace, qr: QrCode, manual: UserPlus, self: Smartphone, family: Users };

function Clock12() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="num">{now ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "America/Chicago" }) : "--:--"}</span>;
}

const TYPES: [string, string][] = [
  ["mass", "Divine Liturgy"], ["vespers", "Vespers"], ["bible_study", "Bible Study"],
  ["youth_meeting", "Youth Meeting"], ["sunday_school", "Sunday School"], ["other", "Other service"],
];

function StartService() {
  const router = useRouter();
  const [type, setType] = useState("mass");
  const [time, setTime] = useState("08:00");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    const db = supabaseBrowser();
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
    const name = TYPES.find((t) => t[0] === type)![1];
    await db.from("services").update({ is_active: false }).eq("is_active", true);
    const { error } = await db.from("services").insert({ name_en: name, name_ar: name, type, date: today, start_time: time, is_active: true });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${name} started. Check-in is open.`);
    router.refresh();
  }

  return (
    <div className={`${card} mx-auto max-w-md space-y-4 p-8 text-center`}>
      <CalendarClock size={40} strokeWidth={1.5} className="mx-auto text-goldtext" />
      <h2 className="font-display text-2xl font-semibold text-heading">No service is open</h2>
      <p className="text-muted">Start today’s service so people can check in.</p>
      <div className="grid gap-3 text-start sm:grid-cols-2">
        <label className="text-sm font-medium">Service
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full rounded-[8px] border border-line bg-page px-3 py-2.5">
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Starts at
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-[8px] border border-line bg-page px-3 py-2.5" />
        </label>
      </div>
      <button onClick={start} disabled={busy} className={`${b("primary")} w-full`}>{busy ? "Starting…" : "Start service"}</button>
    </div>
  );
}

export default function TodayView({
  demo, service, initialArrivals, members,
}: { demo: boolean; service: TodayService | null; initialArrivals: Arrival[]; members: TodayMember[] }) {
  const router = useRouter();
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const [feed, setFeed] = useState<Arrival[]>(() => [...initialArrivals].sort((x, y) => y.min - x.min));
  const clock = useRef(Math.max(0, ...initialArrivals.map((a) => a.min)));

  // real mode: server data is the source of truth after router.refresh()
  const arrivals = demo ? feed : initialArrivals.slice().sort((x, y) => y.min - x.min);
  const here = new Set(arrivals.map((f) => f.memberId));
  const absent = members.filter((m) => !here.has(m.id) && m.status === "active");
  const expected = members.filter((m) => m.status === "active").length;

  async function checkIn(memberId: string) {
    if (demo || !service?.id) {
      clock.current += 2;
      const min = clock.current;
      setFeed((f) => [{ memberId, min, method: "manual", late: service ? min > service.startMin + service.graceMin : false, fresh: true }, ...f.map((x) => ({ ...x, fresh: false }))]);
      return;
    }
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hour12: false, timeZone: "America/Chicago" }).formatToParts(now);
    const min = Number(parts.find((p) => p.type === "hour")!.value) % 24 * 60 + Number(parts.find((p) => p.type === "minute")!.value);
    const { error } = await supabaseBrowser().from("attendance").insert({
      member_id: memberId, service_id: service.id, method: "manual", late_minutes: Math.max(0, min - service.startMin - service.graceMin),
    });
    if (error) return toast.error(error.message);
    router.refresh();
  }

  // demo mode: a new arrival every few seconds so the live feed is visible
  const pool = useRef<string[]>([]);
  useEffect(() => {
    pool.current = absent.map((m) => m.id);
  });
  useEffect(() => {
    if (!demo) return;
    const id = setInterval(() => {
      const next = pool.current[0];
      if (next) {
        clock.current += 1 + Math.floor(Math.random() * 2);
        const min = clock.current;
        setFeed((f) => [{ memberId: next, min, method: "face", late: service ? min > service.startMin + service.graceMin : false, fresh: true }, ...f.map((x) => ({ ...x, fresh: false }))]);
      }
    }, 9000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  async function endService() {
    if (!service?.id) return;
    const { error } = await supabaseBrowser().from("services").update({ is_active: false }).eq("id", service.id);
    if (error) return toast.error(error.message);
    toast.success("Service ended. Check-in is closed.");
    router.refresh();
  }

  const start = service?.startMin ?? 8 * 60;
  const late = arrivals.filter((f) => f.late).length;
  const onTime = arrivals.length ? Math.round(((arrivals.length - late) / arrivals.length) * 100) : 0;
  const males = arrivals.filter((f) => byId.get(f.memberId)?.gender === "male").length;
  const deacons = arrivals.filter((f) => byId.get(f.memberId)?.deacon).length;

  const buckets = useMemo(() => {
    const out: { t: string; n: number }[] = [];
    for (let m = start - 15; m <= start + 35; m += 5) {
      out.push({ t: fmtTime(m).replace(/ [AP]M/, ""), n: arrivals.filter((f) => f.min >= m && f.min < m + 5).length });
    }
    return out;
  }, [arrivals, start]);

  if (!service) return <StartService />;

  const stats = [
    { label: "Checked in", value: arrivals.length, icon: UserCheck, live: true },
    { label: "Expected", value: expected, icon: Users },
    { label: "On time", value: onTime, suffix: "%", icon: Clock },
    { label: "Late", value: late, icon: CalendarClock },
  ];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] bg-coptic p-6 text-cream shadow-lift sm:p-8"
      >
        <div className="absolute -end-10 -top-10 h-56 w-56 rounded-full bg-gold/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-end gap-6">
          <div className="me-auto">
            <p className="text-sm uppercase tracking-widest text-gold-light">Now serving</p>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{service.name}</h1>
            <p className="mt-1 text-cream/80">{service.whenLabel}</p>
            {!demo && service.id && (
              <button onClick={endService} className="mt-3 inline-flex items-center gap-2 rounded-[12px] border border-white/30 px-3 py-1.5 text-sm hover:bg-white/10">
                <Square size={14} /> End service
              </button>
            )}
          </div>
          <div className="text-end">
            <div className="font-display text-4xl font-semibold sm:text-5xl"><Clock12 /></div>
            <p className="text-sm text-cream/75">Central Time</p>
          </div>
        </div>
      </motion.section>

      {demo && <p className="rounded-[12px] bg-gold/15 px-4 py-2 text-sm text-ink">Demo data. New check-ins appear automatically so you can see the live feed.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            whileHover={{ y: -2 }}
            className={`${card} flex items-center gap-4 p-4 transition-shadow hover:shadow-lift`}
          >
            <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-gold/20 text-goldtext"><s.icon size={20} strokeWidth={1.75} /></span>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted">
                {s.label}
                {s.live && <span role="img" className="relative flex h-2 w-2" aria-label="Live"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>}
              </div>
              <div className="font-display text-3xl font-semibold text-heading">
                {s.live ? <span className="num">{s.value}</span> : <CountUp value={s.value} suffix={s.suffix} />}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className={`${card} p-5 lg:col-span-3`} aria-labelledby="feed">
          <h2 id="feed" className="mb-3 font-display text-xl font-semibold text-heading">Checked in</h2>
          {arrivals.length === 0 && <p className="py-6 text-center text-muted">Nobody has checked in yet.</p>}
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {arrivals.map((f) => {
                const m = byId.get(f.memberId);
                if (!m) return null;
                const Icon = METHOD_ICON[f.method] ?? Hand;
                return (
                  <motion.li
                    key={f.memberId}
                    layout
                    initial={{ opacity: 0, x: -16, backgroundColor: "rgb(201 162 74 / 0.25)" }}
                    animate={{ opacity: 1, x: 0, backgroundColor: "rgb(201 162 74 / 0)" }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-3 rounded-[8px] px-2 py-2.5"
                  >
                    <Avatar name={m.name} gender={m.gender} />
                    <div className="me-auto min-w-0">
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        {m.name}
                        {m.deacon && <Badge tone="gold" icon={<Cross size={12} strokeWidth={2} />}>Deacon</Badge>}
                        {f.late && <Badge tone="warning">Late</Badge>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted"><Icon size={13} strokeWidth={1.75} /> {METHOD_LABEL[f.method] ?? f.method}</div>
                    </div>
                    <span className="num w-20 text-end text-sm">{fmtTime(f.min)}</span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </section>

        <div className="space-y-6 lg:col-span-2">
          <section className={`${card} p-5`} aria-labelledby="chart">
            <h2 id="chart" className="mb-1 font-display text-xl font-semibold text-heading">Arrivals</h2>
            <p className="mb-3 text-sm text-muted">Every 5 minutes · <span className="num">{males}</span> men, <span className="num">{arrivals.length - males}</span> women, <span className="num">{deacons}</span> deacons</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted)" }} interval={1} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgb(201 162 74 / 0.12)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12 }} />
                  <Bar dataKey="n" name="Arrivals" fill="#c9a24a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className={`${card} p-5`} aria-labelledby="absent">
            <h2 id="absent" className="mb-3 font-display text-xl font-semibold text-heading">Not here yet <span className="num text-base text-muted">({absent.length})</span></h2>
            {absent.length === 0 ? (
              <p className="text-sm text-muted">Everyone is here ✨</p>
            ) : (
              <ul className="max-h-72 divide-y divide-line overflow-y-auto">
                {absent.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2">
                    <Avatar name={m.name} gender={m.gender} size={32} />
                    <span className="me-auto text-sm font-medium">{m.name}</span>
                    <button
                      className={`${b("secondary")} !px-3 !py-1`}
                      onClick={() => { checkIn(m.id); toast.success(`${m.name} checked in`); }}
                    >
                      Check in
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
