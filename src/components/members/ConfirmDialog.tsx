"use client";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { b } from "@/components/ui";

export default function ConfirmDialog({
  open, title, body, confirmLabel, onCancel, onConfirm,
}: { open: boolean; title: string; body: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancel.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          onClick={onCancel}
        >
          <motion.div
            role="alertdialog" aria-modal="true" aria-labelledby="cd-title"
            initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[16px] border border-line bg-card p-6 text-start shadow-lift"
          >
            <h2 id="cd-title" className="font-display text-xl font-semibold text-heading">{title}</h2>
            <p className="mt-2 text-sm text-muted">{body}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button ref={cancel} onClick={onCancel} className={b("secondary")}>Cancel</button>
              <button onClick={onConfirm} className={`${b("primary")} !bg-[#b42318]`}>{confirmLabel}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
