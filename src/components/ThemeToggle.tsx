"use client";
import { Moon, Sun } from "lucide-react";

// Theme lives in <html data-theme>, saved in localStorage; the inline script in the layout sets it before paint
export default function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="grid h-9 w-9 place-items-center rounded-[12px] text-cream/90 transition hover:bg-white/10 active:scale-[0.98]"
    >
      <Moon size={20} strokeWidth={1.75} className="theme-show-light" />
      <Sun size={20} strokeWidth={1.75} className="theme-show-dark" />
    </button>
  );
}
