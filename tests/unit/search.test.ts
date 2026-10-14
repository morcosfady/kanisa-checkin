import { describe, expect, it } from "vitest";
import { searchScore } from "../../src/lib/search";

const church = "St. Philopateer Coptic Orthodox Church";

describe("searchScore", () => {
  it("finds a church when the dot after St is missing and a letter is dropped", () => {
    expect(searchScore("st philopater", church, "Richardson")).toBeGreaterThan(0);
  });
  it("matches the start of words and is not case sensitive", () => {
    expect(searchScore("PHIL", church)).toBeGreaterThan(0);
    expect(searchScore("pla", "Plano", "Texas")).toBeGreaterThan(0);
  });
  it("finds a church by the city hint", () => {
    expect(searchScore("richard", church, "Richardson")).toBeGreaterThan(0);
  });
  it("tolerates a typo in a city name", () => {
    expect(searchScore("plno", "Plano")).toBeGreaterThan(0);
    expect(searchScore("fort wroth", "Fort Worth")).toBeGreaterThan(0);
  });
  it("does not match unrelated names", () => {
    expect(searchScore("tampa", "Plano", "Texas")).toBe(0);
    expect(searchScore("marina", church)).toBe(0);
  });
  it("ranks a prefix match above a typo match", () => {
    expect(searchScore("phil", church)).toBeGreaterThan(searchScore("philopater", church) - 1);
    expect(searchScore("meena", "St. Meena Coptic Orthodox Church")).toBeGreaterThan(0);
  });
  it("shows everything for an empty box", () => expect(searchScore("", "Anything")).toBe(1));
});
