// Only allow redirects back into our own app (prevents open redirects)
const ALLOWED = [/^\/c\/[A-Za-z0-9_-]{6,64}$/, /^\/(home|check-in|dashboard|kiosk|profile|history)$/];

export function safeNext(next?: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return ALLOWED.some((r) => r.test(next)) ? next : null;
}
