import { describe, expect, it } from "vitest";
import { EMBEDDING_SIZE, laplacianVariance, poseMatches, usableFace } from "../../src/lib/face/quality";

describe("laplacianVariance", () => {
  it("is 0 for a flat image", () => expect(laplacianVariance(new Array(64).fill(100), 8, 8)).toBe(0));
  it("is high for sharp edges and low for a smooth gradient", () => {
    const checker = Array.from({ length: 64 }, (_, i) => ((i % 8) + Math.floor(i / 8)) % 2 === 0 ? 0 : 255);
    const gradient = Array.from({ length: 64 }, (_, i) => (i % 8) * 4);
    expect(laplacianVariance(checker, 8, 8)).toBeGreaterThan(1000);
    expect(laplacianVariance(gradient, 8, 8)).toBeLessThan(1);
  });
});

describe("poseMatches", () => {
  it("accepts a straight face and rejects a turned one", () => {
    expect(poseMatches("straight", 0.05)).toBe(true);
    expect(poseMatches("straight", 0.4)).toBe(false);
  });
  it("needs a real turn for the side steps", () => {
    expect(poseMatches("side-a", 0.05)).toBe(false);
    expect(poseMatches("side-a", 0.35)).toBe(true);
    expect(poseMatches("side-a", 1.2)).toBe(false);
  });
  it("makes the second side the opposite direction", () => {
    expect(poseMatches("side-b", 0.35, 0.3)).toBe(false);
    expect(poseMatches("side-b", -0.35, 0.3)).toBe(true);
  });
});

describe("usableFace", () => {
  const base = { score: 0.9, box: [0, 0, 300, 300] as [number, number, number, number], embedding: new Array(EMBEDDING_SIZE).fill(0.1), real: 0.9, live: 0.9, rotation: { angle: { yaw: 0, pitch: 0 } } };
  it("accepts a good face", () => expect(usableFace(base, 1000, { liveness: true }).ok).toBe(true));
  it("rejects wrong embedding size", () => expect(usableFace({ ...base, embedding: [1, 2] }, 1000, { liveness: false }).reason).toBe("no-embedding"));
  it("rejects a face that is too far away", () => expect(usableFace({ ...base, box: [0, 0, 80, 80] }, 1000, { liveness: false }).reason).toBe("too-far"));
  it("rejects a turned face", () => expect(usableFace({ ...base, rotation: { angle: { yaw: 0.9, pitch: 0 } } }, 1000, { liveness: false }).reason).toBe("turned"));
  it("rejects a spoof only when liveness is on", () => {
    const spoof = { ...base, real: 0.1 };
    expect(usableFace(spoof, 1000, { liveness: true }).reason).toBe("liveness");
    expect(usableFace(spoof, 1000, { liveness: false }).ok).toBe(true);
  });
});
