export const METHOD_LABEL: Record<string, string> = {
  face: "Face scan at the kiosk",
  self: "3-digit code",
  qr: "QR code at the kiosk",
  manual: "Added by an admin",
  family: "Family check-in",
};

const TZ = "America/Chicago";

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: TZ });

// "2026-10-11" + "08:00:00" (+ "12:00:00") -> "Sunday, October 11 · 8:00 AM – 12:00 PM"
const t12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export function fmtService(date: string, start: string, end?: string | null) {
  const d = new Date(`${date}T12:00:00`);
  return `${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${t12(start)}${end ? ` – ${t12(end)}` : ""}`;
}
