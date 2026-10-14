"use client";
import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Area } from "recharts";
import { Table2 } from "lucide-react";
import { TIERS, TIER_LABEL, TIER_RANGE, type Sheet, type Tier } from "@/lib/attendance/calc";
import { TIER_COLOR } from "./ledger-ui";

const md = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const tip = { contentStyle: { background: "var(--l-card)", border: "1px solid var(--l-line)", borderRadius: 12, color: "var(--l-ink)", fontSize: 13 }, labelStyle: { color: "var(--l-ink)", fontWeight: 600 } };

// A card with a title, the chart, a one-line text version, and a "View as table" switch (screen readers + print)
function ChartCard({ title, summary, columns, rows, children, className = "" }: { title: string; summary: string; columns: string[]; rows: (string | number)[][]; children: React.ReactNode; className?: string }) {
  const [table, setTable] = useState(false);
  return (
    <figure className={`l-card p-4 ${className}`}>
      <figcaption className="mb-2 flex items-center gap-2">
        <span className="l-h me-auto text-base">{title}</span>
        <button type="button" aria-pressed={table} onClick={() => setTable(!table)} className="l-chip !min-h-7 !px-2 !py-0.5 text-xs no-print"><Table2 size={13} /> {table ? "Chart" : "Table"}</button>
      </figcaption>
      <p className="sr-only">{summary}</p>
      {table ? (
        <div className="l-scroll max-h-64">
          <table className="w-full text-sm">
            <thead><tr>{columns.map((c) => <th key={c} className="l-mute py-1 pe-3 text-start text-xs font-semibold">{c}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="l-row">{r.map((v, j) => <td key={j} className="py-1 pe-3">{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-label={summary} className="h-56">{children}</div>
      )}
    </figure>
  );
}

export function Charts({ sheet, onTier }: { sheet: Sheet; onTier: (t: Tier) => void }) {
  const anim = !useReducedMotion();
  const t = sheet.totals;
  const notYet = Math.max(0, t.members - t.attendedAtLeastOnce);
  const donut = [{ name: "Attended", value: t.attendedAtLeastOnce, color: "var(--t-faithful)" }, { name: "Did not attend", value: notYet, color: "var(--t-absent)" }];
  const pctAtt = t.members ? Math.round((t.attendedAtLeastOnce / t.members) * 100) : 0;
  const trendData = sheet.perService.map((p) => ({ label: md(p.date), name: p.name, count: p.count, prev: p.prevCount, avg: Math.round(t.avgPerService * 10) / 10 }));
  const tierData = TIERS.map((k) => ({ key: k, name: TIER_LABEL[k], count: t.tiers[k], color: TIER_COLOR[k] }));
  const genderData = sheet.perService.map((p) => ({ label: md(p.date), Men: p.men, Women: p.women, Deacons: p.deacons }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Present vs absent" summary={`${pctAtt}% of members attended at least once: ${t.attendedAtLeastOnce} attended, ${notYet} did not.`}
          columns={["", "Members"]} rows={donut.map((d) => [d.name, d.value])}>
          <div className="relative h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="var(--l-card)" strokeWidth={2} isAnimationActive={anim}>
                  {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip {...tip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div><div className="l-h text-3xl">{pctAtt}%</div><div className="l-mute text-xs">attended</div></div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Attendance per service" className="lg:col-span-2"
          summary={`Attendance over ${sheet.perService.length} services, average ${Math.round(t.avgPerService)} people.`}
          columns={["Date", "Service", "People", "Previous period"]} rows={sheet.perService.map((p) => [md(p.date), p.name, p.count, p.prevCount ?? "—"])}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip {...tip} formatter={(v, n) => [v, n === "count" ? "This period" : n === "prev" ? "Previous period" : "Average"]} labelFormatter={(l, p) => `${l} · ${p?.[0]?.payload?.name ?? ""}`} />
              <Area isAnimationActive={anim} type="monotone" dataKey="count" stroke="var(--c-navy)" strokeWidth={2.5} fill="var(--c-navy)" fillOpacity={0.12} dot={{ r: 3 }} />
              <Line isAnimationActive={anim} type="monotone" dataKey="prev" stroke="var(--c-slate)" strokeWidth={1.5} strokeOpacity={0.55} dot={false} />
              <ReferenceLine y={Math.round(t.avgPerService * 10) / 10} stroke="var(--c-gold)" strokeDasharray="4 4" label={{ value: "avg", position: "insideTopRight", fontSize: 11, fill: "var(--l-goldtext)" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Members by tier" summary={tierData.map((d) => `${d.name} ${d.count}`).join(", ")}
          columns={["Tier", "Range", "Members"]} rows={tierData.map((d) => [d.name, TIER_RANGE[d.key as Tier], d.count])}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tierData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis type="category" dataKey="name" width={78} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip {...tip} cursor={{ fill: "var(--l-hover)" }} />
              <Bar isAnimationActive={anim} dataKey="count" radius={[0, 8, 8, 0]} cursor="pointer" onClick={(d) => onTier((d as unknown as { key: Tier }).key)} label={{ position: "right", fontSize: 12, fill: "var(--l-ink)" }}>
                {tierData.map((d) => <Cell key={d.key} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Arrival time" summary={sheet.lateBuckets.map((b) => `${b.label} ${b.count}`).join(", ")} columns={["Arrival", "Check-ins"]} rows={sheet.lateBuckets.map((b) => [b.label, b.count])}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sheet.lateBuckets} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={0} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip {...tip} cursor={{ fill: "var(--l-hover)" }} />
              <Bar isAnimationActive={anim} dataKey="count" radius={[8, 8, 0, 0]}>
                {sheet.lateBuckets.map((b, i) => <Cell key={b.label} fill={["var(--t-faithful)", "var(--c-gold)", "var(--t-occasional)", "var(--t-rarely)"][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Men, women and deacons" summary="Who came to each service, split into men, women and deacons."
          columns={["Date", "Men", "Women", "Deacons"]} rows={genderData.map((g) => [g.label, g.Men, g.Women, g.Deacons])}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={genderData} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip {...tip} cursor={{ fill: "var(--l-hover)" }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar isAnimationActive={anim} dataKey="Men" stackId="g" fill="var(--c-navy)" />
              <Bar isAnimationActive={anim} dataKey="Women" stackId="g" fill="var(--c-rose)" radius={[6, 6, 0, 0]} />
              <Line isAnimationActive={anim} type="monotone" dataKey="Deacons" stroke="var(--c-gold)" strokeWidth={2} dot={{ r: 2.5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
