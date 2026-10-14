import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadMembers } from "../../src/lib/members";

// A fake client: every call returns the same chain and records `.eq` filters per table.
function fakeDb() {
  const eqs: Record<string, [string, unknown][]> = {};
  const chain = (table: string): unknown =>
    new Proxy(() => {}, {
      get(_t, prop) {
        if (prop === "then") return (res: (v: unknown) => void) => res({ data: [], count: 0, error: null });
        if (prop === "eq") return (col: string, val: unknown) => ((eqs[table] ??= []).push([col, val]), chain(table));
        return () => chain(table);
      },
    });
  return { db: { from: (t: string) => chain(t) } as unknown as SupabaseClient, eqs };
}

describe("members are limited to the managed church", () => {
  it("filters members by the church id", async () => {
    const { db, eqs } = fakeDb();
    await loadMembers(db, "church-a");
    expect(eqs.members).toContainEqual(["church_id", "church-a"]);
  });

  it("shows nobody (not everybody) when no church is chosen yet", async () => {
    const { db, eqs } = fakeDb();
    await loadMembers(db, null);
    const f = eqs.members.find(([c]) => c === "church_id");
    expect(f?.[1]).toBe("00000000-0000-0000-0000-000000000000");
  });
});
