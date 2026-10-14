"use client";
import { FileSpreadsheet, FileText, Moon, Printer, Settings2, Sun } from "lucide-react";
import type { PeriodKey } from "@/lib/attendance/calc";

export const PERIODS: [PeriodKey, string][] = [
  ["week", "This week"], ["4w", "Last 4 weeks"], ["8w", "Last 8 weeks"], ["12w", "Last 12 weeks"],
  ["month", "This month"], ["lastmonth", "Last month"], ["year", "This year"], ["custom", "Custom range"],
];

export type Group = "all" | "male" | "female" | "deacons" | `family:${string}`;

export default function Controls({
  periodKey, onPeriod, custom, onCustom, services, service, onService, families, group, onGroup, countExcused, onCountExcused,
  onPdf, onXlsx, onPrint, onManage, canEdit, ink, onInk, arPdf, onArPdf,
}: {
  periodKey: PeriodKey; onPeriod: (k: PeriodKey) => void; custom: { from: string; to: string }; onCustom: (c: { from: string; to: string }) => void;
  services: string[]; service: string; onService: (s: string) => void; families: string[]; group: Group; onGroup: (g: Group) => void;
  countExcused: boolean; onCountExcused: (v: boolean) => void;
  onPdf: () => void; onXlsx: () => void; onPrint: () => void; onManage: () => void; canEdit: boolean; ink: boolean; onInk: () => void; arPdf: boolean; onArPdf: (v: boolean) => void;
}) {
  return (
    <div className="no-print space-y-3" role="region" aria-label="Filters and export">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold">Period
          <select value={periodKey} onChange={(e) => onPeriod(e.target.value as PeriodKey)} className="l-select mt-1 block">
            {PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        {periodKey === "custom" && (
          <>
            <label className="text-xs font-semibold">From<input type="date" value={custom.from} onChange={(e) => onCustom({ ...custom, from: e.target.value })} className="l-input mt-1 block" /></label>
            <label className="text-xs font-semibold">To<input type="date" value={custom.to} onChange={(e) => onCustom({ ...custom, to: e.target.value })} className="l-input mt-1 block" /></label>
          </>
        )}
        <label className="text-xs font-semibold">Service
          <select value={service} onChange={(e) => onService(e.target.value)} className="l-select mt-1 block">
            <option value="">All services</option>
            {services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold">Group
          <select value={group} onChange={(e) => onGroup(e.target.value as Group)} className="l-select mt-1 block">
            <option value="all">Everyone</option><option value="male">Men</option><option value="female">Women</option><option value="deacons">Deacons</option>
            {families.length > 0 && <optgroup label="Family">{families.map((f) => <option key={f} value={`family:${f}`}>{f}</option>)}</optgroup>}
          </select>
        </label>
        <label className="flex min-h-10 items-center gap-2 text-xs font-semibold">
          <input type="checkbox" checked={countExcused} onChange={(e) => onCountExcused(e.target.checked)} /> Count excused as absent
        </label>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {canEdit && <button onClick={onManage} className="l-btn" aria-label="Manage labels"><Settings2 size={16} /> Labels</button>}
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={arPdf} onChange={(e) => onArPdf(e.target.checked)} /> Arabic report</label>
          <button onClick={onPdf} className="l-btn l-btn-primary"><FileText size={16} /> Export PDF</button>
          <button onClick={onXlsx} className="l-btn"><FileSpreadsheet size={16} /> Export Excel</button>
          <button onClick={onPrint} className="l-btn"><Printer size={16} /> Print</button>
          <button onClick={onInk} className="l-btn" aria-pressed={ink} aria-label={ink ? "Use the parchment look" : "Use the dark ink look"}>{ink ? <Sun size={16} /> : <Moon size={16} />}</button>
        </div>
      </div>
    </div>
  );
}
