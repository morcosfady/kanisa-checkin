"use client";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { computeSheet, type LabelDef, type MemLabel, type Period, type PeriodKey, type Raw, type Row, type Tier } from "@/lib/attendance/calc";
import { exportXlsx } from "@/lib/attendance/export";
import { useRouter } from "@/i18n/navigation";
import { useRouter as useNextRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Charts } from "./Charts";
import Controls, { PERIODS, type Group } from "./Controls";
import Heatmap from "./Heatmap";
import { ManageLabels, type LabelActions } from "./Labels";
import MemberDrawer from "./MemberDrawer";
import NeedsAttention from "./NeedsAttention";
import PrintReport from "./PrintReport";
import RankedList, { DEFAULT_FILTER, applyFilter, type Filter } from "./RankedList";
import Summary from "./Summary";

// Ledger / ink look, remembered on this device
const INK_KEY = "amoinee-ledger-ink";
const inkListeners = new Set<() => void>();
const readInk = () => { try { return localStorage.getItem(INK_KEY) === "1"; } catch { return false; } };
const subInk = (cb: () => void) => { inkListeners.add(cb); return () => { inkListeners.delete(cb); }; };
const setInk = (v: boolean) => { try { localStorage.setItem(INK_KEY, v ? "1" : "0"); } catch {} inkListeners.forEach((f) => f()); };

export default function AttendanceView({ raw, period, periodKey, today, church, demo, canEdit, isSuper = false }: {
  raw: Raw; period: Period; periodKey: PeriodKey; today: string; church: { id: string; name: string }; demo: boolean; canEdit: boolean; isSuper?: boolean;
}) {
  const router = useRouter();
  const nextRouter = useNextRouter(); // keeps ?query (English only app, no locale prefix)
  const ink = useSyncExternalStore(subInk, readInk, () => false);
  const [local, setLocal] = useState<Raw>(raw); // demo mode keeps label changes in memory
  const data = demo ? local : raw;
  const [custom, setCustom] = useState({ from: period.from, to: period.to });
  const [service, setService] = useState("");
  const [group, setGroup] = useState<Group>("all");
  const [countExcused, setCountExcused] = useState(false);
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [manage, setManage] = useState(false);
  const [arPdf, setArPdf] = useState(false);

  const grouped = useMemo<Raw>(() => {
    const keep = (m: Raw["members"][number]) =>
      group === "all" ? true : group === "male" || group === "female" ? m.gender === group : group === "deacons" ? m.deacon : m.family === group.slice(7);
    return { ...data, members: data.members.filter(keep) };
  }, [data, group]);

  const sheet = useMemo(
    () => computeSheet(grouped, { from: period.from, to: period.to, today, serviceName: service || undefined, countExcusedAsAbsent: countExcused }),
    [grouped, period.from, period.to, today, service, countExcused],
  );
  const defs = data.labels;
  const rows = useMemo(() => applyFilter(sheet.rows, filter), [sheet.rows, filter]);
  const serviceNames = useMemo(() => [...new Set(data.services.map((s) => s.name))].sort(), [data.services]);
  const families = useMemo(() => [...new Set(data.members.map((m) => m.family).filter((f): f is string => Boolean(f)))].sort(), [data.members]);
  const tierCounts = useMemo(() => ({ ...sheet.totals.tiers, followup: sheet.totals.followup }) as Record<Tier | "followup", number>, [sheet.totals]);
  const labelCounts = useMemo(() => {
    const m = new Map<string, number>();
    sheet.rows.forEach((r) => r.labels.forEach((l) => m.set(l.def.id, (m.get(l.def.id) ?? 0) + 1)));
    return m;
  }, [sheet.rows]);
  const openRow = open ? sheet.rows.find((r) => r.id === open) ?? null : null;

  const goPeriod = useCallback((k: PeriodKey, c = custom) => {
    const q = k === "custom" ? `?p=custom&from=${c.from}&to=${c.to}` : `?p=${k}`;
    nextRouter.push(`/attendance${q}`);
  }, [nextRouter, custom]);

  // ----- label changes: demo = in memory, real = database functions then refresh -----
  const afterChange = useCallback((msg: string) => { toast.success(msg); router.refresh(); }, [router]);
  const fail = (e: { message: string } | null) => { if (e) toast.error(e.message); return Boolean(e); };

  const actions: LabelActions = useMemo(() => {
    const db = () => supabaseBrowser();
    const defOf = (id: string) => data.labels.find((l) => l.id === id);
    return {
      async add(ids, labelId, note, until) {
        const d = defOf(labelId);
        if (demo) {
          setLocal((r) => {
            const have = new Set(r.memberLabels.filter((m) => m.labelId === labelId && !m.removedAt).map((m) => m.memberId));
            const days = d?.days ?? null;
            const end = until ?? (days ? new Date(Date.now() + days * 86400000).toISOString().slice(0, 10) : null);
            const add: MemLabel[] = ids.filter((id) => !have.has(id)).map((id) => ({ id: `${id}-${labelId}-${Date.now()}`, memberId: id, labelId, addedAt: new Date().toISOString(), by: "You", note: note?.trim() || null, until: end, snooze: null, removedAt: null }));
            return { ...r, memberLabels: [...r.memberLabels, ...add] };
          });
          return void toast.success(`${d?.name ?? "Label"} added`);
        }
        const { data: n, error } = await db().rpc("label_members", { p_members: ids, p_label: labelId, p_note: note || null, p_until: until || null });
        if (!fail(error)) afterChange(`${d?.name ?? "Label"} added to ${n ?? ids.length}`);
      },
      async remove(memberId, labelId) {
        if (demo) {
          setLocal((r) => ({ ...r, memberLabels: r.memberLabels.map((m) => (m.memberId === memberId && m.labelId === labelId && !m.removedAt ? { ...m, removedAt: new Date().toISOString() } : m)) }));
          return void toast.success("Label removed");
        }
        const { error } = await db().rpc("unlabel_member", { p_member: memberId, p_label: labelId });
        if (!fail(error)) afterChange("Label removed");
      },
      async snooze(memberId, days) {
        const f = data.labels.find((l) => l.key === "followup");
        if (demo && f) {
          const until = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
          setLocal((r) => ({ ...r, memberLabels: r.memberLabels.map((m) => (m.memberId === memberId && m.labelId === f.id && !m.removedAt ? { ...m, snooze: until } : m)) }));
          return void toast.success(`Snoozed for ${days} days`);
        }
        const { error } = await db().rpc("snooze_followup", { p_member: memberId, p_days: days });
        if (!fail(error)) afterChange(`Follow-up snoozed for ${days} days`);
      },
      async save(def) {
        if (demo) {
          setLocal((r) => ({
            ...r,
            labels: def.id
              ? r.labels.map((l) => (l.id === def.id ? ({ ...l, ...def } as LabelDef) : l))
              : [...r.labels, { id: `L-${Date.now()}`, key: null, name: def.name ?? "", nameAr: def.nameAr ?? "", emoji: def.emoji ?? "", color: def.color ?? "#5B6275", description: def.description ?? "", system: false, auto: false, excuses: Boolean(def.excuses), hides: false, days: null, order: r.labels.length + 1, active: true }],
          }));
          return;
        }
        const body = {
          ...(def.name !== undefined && { name_en: def.name }), ...(def.nameAr !== undefined && { name_ar: def.nameAr }), ...(def.emoji !== undefined && { emoji: def.emoji }),
          ...(def.color !== undefined && { color: def.color }), ...(def.description !== undefined && { description: def.description }),
          ...(def.excuses !== undefined && { excuses: def.excuses }), ...(def.active !== undefined && { is_active: def.active }),
        };
        const q = def.id
          ? db().from("labels").update(body).eq("id", def.id)
          : db().from("labels").insert({ ...body, church_id: church.id, sort_order: Math.max(0, ...data.labels.map((l) => l.order)) + 1 });
        const { error } = await q;
        if (!fail(error)) afterChange("Label saved");
      },
      async del(id) {
        if (demo) return setLocal((r) => ({ ...r, labels: r.labels.filter((l) => l.id !== id), memberLabels: r.memberLabels.filter((m) => m.labelId !== id) }));
        const { error } = await db().from("labels").delete().eq("id", id);
        if (!fail(error)) afterChange("Label deleted");
      },
      async setMisses(n) {
        if (demo) return void toast.success(`Follow-up now starts after ${n} missed services (demo)`);
        const { error } = await db().from("settings").update({ followup_misses: n }).neq("timezone", "");
        if (!fail(error)) afterChange(`Follow-up now starts after ${n} missed services`);
      },
      async move(id, dir) {
        const sorted = [...data.labels].sort((a, b) => a.order - b.order);
        const i = sorted.findIndex((l) => l.id === id), j = i + dir;
        if (i < 0 || j < 0 || j >= sorted.length) return;
        const a = sorted[i], b = sorted[j];
        if (demo) return setLocal((r) => ({ ...r, labels: r.labels.map((l) => (l.id === a.id ? { ...l, order: b.order } : l.id === b.id ? { ...l, order: a.order } : l)) }));
        const r1 = await db().from("labels").update({ sort_order: b.order }).eq("id", a.id);
        const r2 = await db().from("labels").update({ sort_order: a.order }).eq("id", b.id);
        if (!fail(r1.error) && !fail(r2.error)) router.refresh();
      },
    };
  }, [data.labels, demo, church.id, afterChange, router]);

  const periodText = periodKey === "custom" ? `${period.from} to ${period.to}` : PERIODS.find(([k]) => k === periodKey)?.[1] ?? period.label;
  const weeksText = `${period.label} · ${sheet.services.length} ${sheet.services.length === 1 ? "service" : "services"}`;

  function pdf() {
    document.body.dataset.print = "report";
    const done = () => { delete document.body.dataset.print; window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
  }
  const printPage = () => { delete document.body.dataset.print; window.print(); };

  return (
    <>
      <div className="ledger ledger-page space-y-6" data-ink={ink} data-testid="attendance-page">
        <header>
          <h1 className="l-title text-3xl sm:text-4xl">Attendance Sheet</h1>
          <div className="l-rule" />
          <p className="l-mute mt-2 text-sm"><b className="text-[var(--l-ink)]">{church.name}</b> · {weeksText}{service ? ` · ${service}` : ""}{sheet.hiddenCount ? ` · ${sheet.hiddenCount} moved away not counted` : ""}</p>
        </header>

        <Controls
          periodKey={periodKey} onPeriod={(k) => goPeriod(k)} custom={custom}
          onCustom={(c) => { setCustom(c); if (periodKey === "custom" && c.from && c.to) goPeriod("custom", c); }}
          services={serviceNames} service={service} onService={setService} families={families} group={group} onGroup={setGroup}
          countExcused={countExcused} onCountExcused={setCountExcused}
          onPdf={pdf} onXlsx={() => exportXlsx(sheet, data, church.name, periodText).catch(() => toast.error("Could not make the Excel file"))} onPrint={printPage}
          onManage={() => setManage(true)} canEdit={canEdit} ink={ink} onInk={() => setInk(!ink)} arPdf={arPdf} onArPdf={setArPdf}
        />

        {data.members.length === 0 ? (
          <div className="l-card p-10 text-center"><p className="l-h text-xl">No members in {church.name} yet</p><p className="l-mute mt-1">Add members first, then their attendance shows here.</p></div>
        ) : (
          <>
            <Summary sheet={sheet} periodLabel={period.label} serviceName={service || undefined} onFollowup={() => { setFilter({ ...DEFAULT_FILTER, tier: "followup" }); document.getElementById("who-h")?.scrollIntoView({ behavior: "smooth" }); }} />
            <Charts sheet={sheet} onTier={(t) => { setFilter({ ...DEFAULT_FILTER, tier: t }); document.getElementById("who-h")?.scrollIntoView({ behavior: "smooth" }); }} />
            <Heatmap raw={grouped} sheet={sheet} rows={rows} onOpen={(r) => setOpen(r.id)} />
            <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
              <RankedList
                rows={rows} total={sheet.rows.length} filter={filter} setFilter={setFilter} tierCounts={tierCounts} defs={defs} today={today} canEdit={canEdit}
                selected={selected} setSelected={setSelected} onOpen={(r) => setOpen(r.id)} actions={actions} labelCounts={labelCounts}
              />
              <aside aria-label="Needs attention"><NeedsAttention sheet={sheet} defs={defs} today={today} canEdit={canEdit} actions={actions} onOpen={(r: Row) => setOpen(r.id)} /></aside>
            </div>
          </>
        )}

        {openRow && <MemberDrawer row={openRow} raw={grouped} sheet={sheet} defs={defs} today={today} canEdit={canEdit} actions={actions} demo={demo} onClose={() => setOpen(null)} />}
        {manage && <ManageLabels defs={defs} actions={actions} onClose={() => setManage(false)} misses={data.followupMisses} canSetMisses={isSuper} />}
      </div>
      <PrintReport sheet={sheet} church={church.name} periodText={periodText} serviceName={service || undefined} today={today} ar={arPdf} />
    </>
  );
}
