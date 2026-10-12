"use client";
import { useState } from "react";

type Labels = Record<
  "look" | "simulate" | "demo" | "already" | "welcomeTemplate" | "notRecognized" | "searchName" | "scanQr" | "imNew",
  string
>;

// Demo mode: simulates recognition without a camera
export default function KioskDemo({ names, labels }: { names: string[]; labels: Labels }) {
  const [seen, setSeen] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [unknown, setUnknown] = useState(false);

  function simulate() {
    const roll = Math.floor(Math.random() * (names.length + 1));
    if (roll === names.length) {
      setUnknown(true);
      setMsg(null);
      return;
    }
    setUnknown(false);
    const name = names[roll];
    if (seen.includes(name)) return setMsg({ text: `${name}: ${labels.already}`, ok: false });
    setSeen([...seen, name]);
    setMsg({ text: labels.welcomeTemplate.replace("{name}", name), ok: true });
  }

  return (
    <div className="w-full max-w-xl space-y-4">
      <p className="text-xl">{labels.look}</p>
      <div role="status" aria-live="polite" className="min-h-28">
        {msg && (
          <div className={`rounded-2xl p-6 text-3xl font-bold ${msg.ok ? "bg-green-600" : "bg-gold text-ink"}`}>{msg.text}</div>
        )}
        {unknown && (
          <div className="space-y-3 rounded-2xl bg-white p-4 text-ink">
            <p className="text-xl font-bold">{labels.notRecognized}</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[labels.searchName, labels.scanQr, labels.imNew].map((l) => (
                <button key={l} className="rounded-xl bg-coptic px-5 py-4 text-lg text-white">{l}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button onClick={simulate} className="rounded-xl bg-gold px-8 py-4 text-xl font-bold text-ink">
        {labels.simulate} ({labels.demo})
      </button>
    </div>
  );
}
