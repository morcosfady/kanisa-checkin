"use client";
import { useState } from "react";
import { ScanFace } from "lucide-react";
import { toast } from "sonner";
import FaceEnroll from "@/components/face/FaceEnroll";
import { b, card } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";

// Lets a person enroll their own face with their phone camera (needs consent on their profile)
export default function MyFaceCard({ name, enrolled }: { name: string; enrolled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function save(embeddings: number[][]) {
    if (!hasSupabase) {
      toast.success(`${embeddings.length} face templates captured (demo, not saved)`);
      return true;
    }
    const { error } = await supabaseBrowser().rpc("enroll_my_face", { p_emb: embeddings });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Your face is enrolled. The kiosk can now check you in.");
    router.refresh();
    return true;
  }

  return (
    <div className={`${card} mx-auto flex max-w-xl flex-wrap items-center gap-4 p-5`}>
      <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-gold/20 text-goldtext"><ScanFace size={22} strokeWidth={1.75} /></span>
      <div className="me-auto">
        <div className="font-semibold">Face check-in {enrolled ? "is on" : "is not set up"}</div>
        <div className="text-sm text-muted">{enrolled ? "The kiosk will recognize you at the door." : "Take 3 quick scans so the kiosk can recognize you."}</div>
      </div>
      <button onClick={() => setOpen(true)} className={b(enrolled ? "secondary" : "primary")}>{enrolled ? "Re-scan my face" : "Set up face check-in"}</button>
      <FaceEnroll open={open} name={name} onClose={() => setOpen(false)} onDone={save} />
    </div>
  );
}
