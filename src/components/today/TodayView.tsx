"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, Clock, Cross, QrCode, ScanFace, UserCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Badge, CountUp, b, card } from "@/components/ui";
import { demoArrivals, demoMembers, demoService, fmtTime, toMinutes } from "@/lib/demo";

const START = 8 * 60;
const GRACE = 10;
type Arrival = { memberId: string; min: number; method: "face" | "qr" | "manual"; fresh?: boolean };

const METHOD = { face: ScanFace, qr: QrCode, manual: UserPlus } as const;

function Clock12() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="num">{now ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "--:--"}</span>;
}

export default function TodayView() {
  const byId = useMemo(() => new Map(demoMembers.map((m) => [m.id, m])), []);
  const [feed, setFeed] = useState<Arrival[]>(() =>
    demoArrivals.map((a) => ({ memberId: a.memberId, min: toMinutes(a.time), method: a.method as Arrival["method"] })).sort((x, y) => y.min - x.min),
  );
  const clock = useRef(Math.max(...demoArrivals.map((a) => toMinutes(a.time))));

  const here = new Set(feed.map((f) => f.memberId));
  const absent = demoMembers.filter((m) => !here.has(m.id) && m.status === "active");
  const expected = demoMembers.filter((m) => m.status === "active").length;

  function checkIn(memberId: string, method: Arrival["method"]) {
    clock.current += 1 + Math.floor(Math.random() * 2);
    setFeed((f) => [{ memberId, min: clock.current, method, fresh: true }, ...f.map((x) => ({ ...x, fresh: false }))]);
  }

  // demo mode: a new arrival every few seconds so the live feed is visible
  const pool = useRef<string[]>([]);
  useEffect(() => {
    pool.current = absent.map((m) => m.id);
  });
  useEffect(() => {
    const id = setInterval(() => {
      const next = pool.current[0];
      if (next) checkIn(next, "face");
    }, 9000);
    return () => clearInterval(id);
  }, []);

  const late = feed.filter((f) => f.min > START + GRACE).length;
  const onTime = feed.length ? Math.round(((feed.length - late) / feed.length) * 100) : 0;
  const males = feed.filter((f) => byId.get(f.memberId)?.gender === "male").length;
  const deacons = feed.filter((f) => byId.get(f.memberId)?.deacon).length;

  const buckets = useMemo(() => {
    const out: { t: string; n: number }[] = [];
    for (let m = 7 * 60 + 45; m <= 8 * 60 + 35; m += 5) {
      out.push({ t: fmtTime(m).replace(" AM", ""), n: feed.filter((f) => f.min >= m && f.min < m + 5).length });
    }
    return out;
  }, [feed]);

  const stats = [
    { label: "Checked in", value: feed.length, icon: UserCheck, live: true },
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
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{demoService.nameEn}</h1>
            <p className="mt-1 text-cream/80">Sunday, October 11 · starts {demoService.start}</p>
          </div>
          <div className="text-end">
            <div className="font-display text-4xl font-semibold sm:text-5xl"><Clock12 /></div>
            <p className="text-sm text-cream/75">Central Time</p>
          </div>
        </div>
      </motion.section>

      <p className="rounded-[12px] bg-gold/15 px-4 py-2 text-sm text-ink">Demo data. New check-ins appear automatically so you can see the live feed.</p>

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
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {feed.map((f) => {
                const m = byId.get(f.memberId)!;
                const Icon = METHOD[f.method];
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
                        {f.min > START + GRACE && <Badge tone="warning">Late</Badge>}
                      </div>
                    </div>
                    <span title={`Checked in by ${f.method}`} className="text-muted"><Icon size={18} strokeWidth={1.75} /></span>
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
            <p className="mb-3 text-sm text-muted">Every 5 minutes · <span className="num">{males}</span> men, <span className="num">{feed.length - males}</span> women, <span className="num">{deacons}</span> deacons</p>
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
                      onClick={() => { checkIn(m.id, "manual"); toast.success(`${m.name} checked in`); }}
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
