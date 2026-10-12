import { describe, expect, it } from "vitest";
import { consecutiveMisses, isDuplicate, lateMinutes, needsEftekad } from "../../src/lib/attendance/logic";

describe("lateMinutes", () => {
  const start = "2026-10-11T13:00:00Z";
  it("is 0 within grace", () => expect(lateMinutes(start, "2026-10-11T13:08:00Z", 10)).toBe(0));
  it("counts minutes after grace", () => expect(lateMinutes(start, "2026-10-11T13:25:00Z", 10)).toBe(25));
  it("is 0 when early", () => expect(lateMinutes(start, "2026-10-11T12:50:00Z", 10)).toBe(0));
});

describe("isDuplicate", () => {
  const list = [{ memberId: "a", serviceId: "s1" }];
  it("detects same member and service", () => expect(isDuplicate(list, "a", "s1")).toBe(true));
  it("allows other service", () => expect(isDuplicate(list, "a", "s2")).toBe(false));
});

describe("eftekad", () => {
  const ids = ["s1", "s2", "s3", "s4", "s5"];
  it("counts trailing misses", () => expect(consecutiveMisses(ids, new Set(["s1", "s2"]))).toBe(3));
  it("flags at threshold", () => expect(needsEftekad(ids, new Set(["s1", "s2"]), 3)).toBe(true));
  it("does not flag after recent visit", () => expect(needsEftekad(ids, new Set(["s5"]), 3)).toBe(false));
});
