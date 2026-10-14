"use client";
import { summaryAr } from "@/lib/attendance/export";
import { TIERS, TIER_LABEL, lastSeenText, pct, summaryText, type Sheet } from "@/lib/attendance/calc";

// One-page "Abouna report". Hidden on screen; "Export PDF" prints only this (Save as PDF in the print dialog).
export default function PrintReport({ sheet, church, periodText, serviceName, today, ar }: { sheet: Sheet; church: string; periodText: string; serviceName?: string; today: string; ar: boolean }) {
  const t = sheet.totals;
  const top = sheet.rows.filter((r) => r.present > 0).slice(0, 10);
  const need = sheet.rows.filter((r) => r.followup).sort((a, b) => a.streak - b.streak);
  const max = Math.max(1, ...sheet.perService.map((p) => p.count));
  const att = t.members ? t.attendedAtLeastOnce / t.members : 0;
  const R = 36, C = 2 * Math.PI * R;
  const tx = (en: string, a: string) => (ar ? a : en);

  return (
    <div className="print-report ledger" dir={ar ? "rtl" : "ltr"} lang={ar ? "ar" : "en"} data-ink="false" style={{ fontFamily: ar ? "var(--font-cairo), sans-serif" : undefined }}>
      <header style={{ borderBottom: "2px solid var(--l-burg)", paddingBottom: 6, marginBottom: 10 }}>
        <div className="l-title" style={{ fontSize: 22 }}>{tx("Attendance Report", "تقرير الحضور")}</div>
        <div style={{ fontSize: 12 }}>{church} · {periodText}{serviceName ? ` · ${serviceName}` : ""}</div>
      </header>
      <p style={{ fontSize: 12, lineHeight: 1.5, margin: "0 0 10px" }}>{ar ? summaryAr(sheet) : summaryText(sheet, periodText, serviceName)}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
        {[
          [tx("Average per service", "متوسط الحضور"), String(Math.round(t.avgPerService))],
          [tx("Attendance rate", "نسبة الحضور"), pct(t.rate)],
          [tx("Faithful (90%+)", "ملتزمون"), String(t.faithful)],
          [tx("Need follow-up", "يحتاجون متابعة"), String(t.followup)],
        ].map(([l, v]) => (
          <div key={l} style={{ border: "1px solid var(--l-line)", borderRadius: 8, padding: "6px 8px" }}>
            <div style={{ fontSize: 10, color: "var(--l-mute)" }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 12, marginBottom: 10 }}>
        <svg viewBox="0 0 100 100" width="130" height="130" role="img" aria-label={`${Math.round(att * 100)}%`}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="#7A1F2B" strokeOpacity="0.25" strokeWidth="14" />
          <circle cx="50" cy="50" r={R} fill="none" stroke="#2E7D4F" strokeWidth="14" strokeDasharray={`${C * att} ${C}`} transform="rotate(-90 50 50)" />
          <text x="50" y="55" textAnchor="middle" fontSize="16" fontWeight="700">{Math.round(att * 100)}%</text>
        </svg>
        <svg viewBox="0 0 400 110" width="100%" height="120" role="img" aria-label={tx("Attendance per service", "الحضور لكل خدمة")}>
          {sheet.perService.map((p, i) => {
            const w = 400 / Math.max(1, sheet.perService.length);
            const h = (p.count / max) * 90;
            return <rect key={p.id} x={i * w + 2} y={100 - h} width={Math.max(2, w - 4)} height={h} rx="2" fill="#1E2A44" />;
          })}
          <line x1="0" y1="100" x2="400" y2="100" stroke="#E8DFC8" />
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <section>
          <h3 style={{ fontSize: 13, margin: "0 0 4px" }}>{tx("Top 10 most faithful", "الأكثر التزامًا")}</h3>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}><tbody>
            {top.map((r) => <tr key={r.id} style={{ borderTop: "1px solid var(--l-line)" }}><td>{r.rank}</td><td>{r.name}</td><td style={{ textAlign: "end" }}>{r.present}/{r.possible}</td><td style={{ textAlign: "end" }}>{pct(r.rate)}</td></tr>)}
          </tbody></table>
          <h3 style={{ fontSize: 13, margin: "10px 0 4px" }}>{tx("Members by tier", "الأعضاء حسب الالتزام")}</h3>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}><tbody>
            {TIERS.map((k) => <tr key={k} style={{ borderTop: "1px solid var(--l-line)" }}><td>{TIER_LABEL[k]}</td><td style={{ textAlign: "end" }}>{t.tiers[k]}</td></tr>)}
          </tbody></table>
        </section>
        <section>
          <h3 style={{ fontSize: 13, margin: "0 0 4px" }}>{tx("Follow-up list", "قائمة المتابعة")} ({need.length})</h3>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}><tbody>
            {need.slice(0, 24).map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--l-line)" }}>
                <td>{r.name}</td>
                <td>{r.labels.filter((l) => l.def.key !== "followup").map((l) => (ar && l.def.nameAr ? l.def.nameAr : l.def.name)).join(", ")}</td>
                <td style={{ textAlign: "end" }}>{lastSeenText(r.lastAttended, today, r.joined)}</td>
              </tr>
            ))}
          </tbody></table>
        </section>
      </div>
      <footer style={{ marginTop: 14, fontSize: 10, color: "var(--l-mute)" }}>{tx("Printed", "طُبع في")} {today} · Amoinee</footer>
    </div>
  );
}
