// Pure helpers for judging a face frame (unit tested)

// Sharpness: variance of the Laplacian over a grayscale image. Low = blurry.
export function laplacianVariance(gray: ArrayLike<number>, w: number, h: number): number {
  if (w < 3 || h < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

export const MIN_SHARPNESS = 25;

export type PoseStep = "straight" | "side-a" | "side-b";

// yaw in radians from the face model. "side-a" and "side-b" are opposite turns.
export function poseMatches(step: PoseStep, yaw: number, firstSideYaw?: number): boolean {
  const a = Math.abs(yaw);
  if (step === "straight") return a < 0.13;
  if (a < 0.17 || a > 0.7) return false;
  if (step === "side-b" && firstSideYaw !== undefined) return Math.sign(yaw) !== Math.sign(firstSideYaw);
  return true;
}

export type FaceLike = {
  score?: number;
  box?: [number, number, number, number];
  embedding?: number[];
  real?: number;
  live?: number;
  rotation?: { angle: { yaw: number; pitch: number } } | null;
};

export const EMBEDDING_SIZE = 1024;

// Is this detection good enough to use for matching or enrolling?
export function usableFace(f: FaceLike, frameWidth: number, opts: { liveness: boolean; minWidthRatio?: number }): { ok: boolean; reason?: string } {
  if (!f.embedding || f.embedding.length !== EMBEDDING_SIZE) return { ok: false, reason: "no-embedding" };
  if ((f.score ?? 0) < 0.6) return { ok: false, reason: "low-score" };
  const width = f.box?.[2] ?? 0;
  if (width / frameWidth < (opts.minWidthRatio ?? 0.16)) return { ok: false, reason: "too-far" };
  const yaw = Math.abs(f.rotation?.angle.yaw ?? 0);
  const pitch = Math.abs(f.rotation?.angle.pitch ?? 0);
  if (yaw > 0.6 || pitch > 0.6) return { ok: false, reason: "turned" };
  if (opts.liveness && ((f.real ?? 0) < 0.5 || (f.live ?? 0) < 0.5)) return { ok: false, reason: "liveness" };
  return { ok: true };
}
