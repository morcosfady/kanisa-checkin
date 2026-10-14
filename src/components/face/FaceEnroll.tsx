"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ScanFace, X } from "lucide-react";
import { b } from "@/components/ui";
import { faceCrop, loadHuman, setLiveness } from "@/lib/face/human";
import { laplacianVariance, MIN_SHARPNESS, poseMatches, usableFace, type PoseStep } from "@/lib/face/quality";

const STEPS: { id: PoseStep; text: string }[] = [
  { id: "straight", text: "Look straight at the camera" },
  { id: "side-a", text: "Slowly turn your head a little to one side" },
  { id: "side-b", text: "Now turn a little to the other side" },
];

const REASONS: Record<string, string> = {
  "no-embedding": "Looking for a face…",
  "low-score": "Please face the camera and add some light.",
  "too-far": "Move a little closer.",
  turned: "Turn your face back toward the camera.",
};

type Props = {
  open: boolean;
  name: string;
  onClose: () => void;
  // receives 3 face templates (numbers only, never photos); return true when saved
  onDone: (embeddings: number[][]) => Promise<boolean>;
};

export default function FaceEnroll({ open, name, onClose, onDone }: Props) {
  return <AnimatePresence>{open && <Inner key="enroll" name={name} onClose={onClose} onDone={onDone} />}</AnimatePresence>;
}

function Inner({ name, onClose, onDone }: Omit<Props, "open">) {
  const video = useRef<HTMLVideoElement>(null);
  // keep the latest callbacks without restarting the camera when the parent re-renders
  const cb = useRef({ onClose, onDone });
  useEffect(() => {
    cb.current = { onClose, onDone };
  });
  const [step, setStep] = useState(0);
  const [hint, setHint] = useState("Starting the camera…");
  const [phase, setPhase] = useState<"loading" | "scanning" | "saving" | "done" | "error">("loading");

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const caps: number[][] = [];
    let firstSideYaw: number | undefined;
    let good = 0;

    const stopAll = () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } }, audio: false });
        if (stopped) return stopAll();
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        setHint("Loading face models… this takes a few seconds the first time.");
        const human = await loadHuman();
        setLiveness(human, false);
        if (stopped) return;
        setPhase("scanning");
        setHint(STEPS[0].text);

        const tick = async () => {
          if (stopped) return;
          const res = await human.detect(v);
          if (stopped) return;
          const faces = res.face;
          const current = STEPS[caps.length];
          if (faces.length > 1) {
            good = 0;
            setHint("Only one person at a time, please.");
          } else if (faces.length === 0) {
            good = 0;
            setHint(`No face yet. ${current.text}.`);
          } else {
            const f = faces[0];
            const u = usableFace(f as never, v.videoWidth, { liveness: false, minWidthRatio: 0.22 });
            const yaw = f.rotation?.angle.yaw ?? 0;
            let sharp = 0;
            if (f.box) {
              const c = faceCrop(v, f.box as [number, number, number, number]);
              sharp = laplacianVariance(c.gray, c.size, c.size);
            }
            if (!u.ok) {
              good = 0;
              setHint(REASONS[u.reason ?? ""] ?? current.text);
            } else if (!poseMatches(current.id, yaw, firstSideYaw)) {
              good = 0;
              setHint(current.text);
            } else if (sharp < MIN_SHARPNESS) {
              good = 0;
              setHint("Hold still, the picture is blurry.");
            } else {
              good++;
              setHint("Hold still…");
              if (good >= 3) {
                caps.push(Array.from(f.embedding!));
                if (current.id === "side-a") firstSideYaw = yaw;
                good = 0;
                setStep(caps.length);
                if (caps.length === STEPS.length) {
                  stopAll();
                  setPhase("saving");
                  setHint("Saving…");
                  const saved = await cb.current.onDone(caps);
                  if (saved) {
                    setPhase("done");
                    setHint("Face saved. Thank you 🙏");
                    setTimeout(() => cb.current.onClose(), 1400);
                  } else {
                    setPhase("error");
                    setHint("Could not save. Please try again.");
                  }
                  return;
                }
                setHint(STEPS[caps.length].text);
              }
            }
          }
          timer = setTimeout(tick, 150);
        };
        tick();
      } catch (e) {
        setPhase("error");
        setHint(e instanceof Error && e.name === "NotAllowedError" ? "Camera permission was blocked. Allow the camera and try again." : "Could not start the camera or the face models.");
      }
    })();

    return stopAll;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
    >
      <motion.div
        role="dialog" aria-modal="true" aria-labelledby="fe-title"
        initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
        className="w-full max-w-md overflow-hidden rounded-[24px] border border-line bg-card shadow-lift"
      >
        <div className="flex items-center gap-3 bg-coptic px-5 py-4 text-cream">
          <ScanFace size={22} strokeWidth={1.75} />
          <h2 id="fe-title" className="me-auto font-display text-lg font-semibold">Enroll face · {name}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-[8px] hover:bg-white/10"><X size={20} /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className={`relative aspect-[4/3] overflow-hidden rounded-[16px] border-4 bg-[#1a0f11] transition-colors ${phase === "done" ? "border-[#2f7a4f]" : "border-gold/70"}`}>
            <video ref={video} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            {phase === "done" && (
              <div className="absolute inset-0 grid place-items-center bg-[#2f7a4f]/30"><Check size={72} className="rounded-full bg-[#2f7a4f] p-3 text-white" /></div>
            )}
          </div>
          <div className="flex justify-center gap-2" aria-label={`${step} of 3 captured`}>
            {STEPS.map((s, i) => (
              <span key={s.id} className={`h-2.5 w-10 rounded-full transition-colors ${i < step ? "bg-[#2f7a4f]" : "bg-line"}`} />
            ))}
          </div>
          <p role="status" aria-live="polite" className="min-h-12 text-center text-lg font-medium">{hint}</p>
          <p className="text-center text-xs text-muted">Only numbers are saved, never a photo.</p>
          {phase === "error" && <button onClick={onClose} className={`${b("secondary")} w-full`}>Close</button>}
        </div>
      </motion.div>
    </motion.div>
  );
}
