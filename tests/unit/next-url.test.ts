import { describe, expect, it } from "vitest";
import { safeNext } from "../../src/lib/next-url";

describe("safeNext", () => {
  it("allows the QR check-in path and app pages", () => {
    expect(safeNext("/c/abc123DEF456")).toBe("/c/abc123DEF456");
    expect(safeNext("/kiosk")).toBe("/kiosk");
    expect(safeNext("/check-in")).toBe("/check-in");
  });
  it("blocks other sites and odd paths", () => {
    expect(safeNext("https://evil.example")).toBeNull();
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("/c/../../etc")).toBeNull();
    expect(safeNext("/approvals")).toBeNull();
    expect(safeNext(undefined)).toBeNull();
  });
});
