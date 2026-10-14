export const METHOD_LABEL: Record<string, string> = {
  face: "Face scan at the kiosk",
  self: "Self check-in",
  qr: "QR code",
  manual: "Added by an admin",
  family: "Family check-in",
};

const TZ = "America/Chicago";

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: TZ });

// "2026-10-11" + "08:00:00" -> "Sunday, October 11 · 8:00 AM"
export function fmtService(date: string, start: string) {
  const d = new Date(`${date}T12:00:00`);
  const [h, m] = start.split(":").map(Number);
  const t = `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  return `${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${t}`;
}
