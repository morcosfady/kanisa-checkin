import type { Human } from "@vladmandic/human";

// Loads the face models once per page (browser only). Models are served from /models on our own site.
let loading: Promise<Human> | null = null;

export function loadHuman(): Promise<Human> {
  if (!loading) {
    loading = (async () => {
      const { Human: H } = await import("@vladmandic/human");
      const human = new H({
        modelBasePath: "/models/",
        backend: "webgl",
        async: true,
        warmup: "none",
        debug: false,
        filter: { enabled: true, equalization: false },
        face: {
          enabled: true,
          detector: { rotation: false, maxDetected: 4, minConfidence: 0.5 },
          mesh: { enabled: true },
          iris: { enabled: false },
          description: { enabled: true },
          emotion: { enabled: false },
          antispoof: { enabled: true },
          liveness: { enabled: true },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: false },
        segmentation: { enabled: false },
      });
      await human.load();
      return human;
    })().catch((e) => {
      loading = null; // allow a retry
      throw e;
    });
  }
  return loading;
}

// Kiosk checks liveness; enrollment does not (an admin or the person themself is present)
export function setLiveness(human: Human, on: boolean) {
  human.config.face.antispoof!.enabled = on;
  human.config.face.liveness!.enabled = on;
}

// Sharpness of the face area, from a small grayscale crop of the video frame
export function faceCrop(video: HTMLVideoElement, box: [number, number, number, number], size = 64) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(video, box[0], box[1], box[2], box[3], 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const gray = new Uint8ClampedArray(size * size);
  for (let i = 0; i < gray.length; i++) gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  return { gray, size };
}
