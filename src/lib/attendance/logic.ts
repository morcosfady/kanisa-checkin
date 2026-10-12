// Pure attendance rules (unit tested)

export function lateMinutes(startISO: string, checkedInISO: string, graceMinutes: number): number {
  const diff = Math.floor((Date.parse(checkedInISO) - Date.parse(startISO)) / 60000);
  return diff > graceMinutes ? diff : 0;
}

export function isDuplicate(
  existing: { memberId: string; serviceId: string }[],
  memberId: string,
  serviceId: string,
): boolean {
  return existing.some((a) => a.memberId === memberId && a.serviceId === serviceId);
}

// serviceIds sorted oldest to newest; attended = service ids the member attended
export function consecutiveMisses(serviceIds: string[], attended: Set<string>): number {
  let n = 0;
  for (let i = serviceIds.length - 1; i >= 0; i--) {
    if (attended.has(serviceIds[i])) break;
    n++;
  }
  return n;
}

export function needsEftekad(serviceIds: string[], attended: Set<string>, threshold: number): boolean {
  return consecutiveMisses(serviceIds, attended) >= threshold;
}
