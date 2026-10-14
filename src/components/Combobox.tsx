"use client";
import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { searchScore } from "@/lib/search";

export type Option = { id: string; label: string; hint?: string };
export type Choice = { id: string | null; text: string };

// Type to search a list. Pick an item, or (if allowed) use what you typed when it is not in the list.
export default function Combobox({
  label, value, onChange, options, placeholder, required, otherLabel, boost, name,
}: {
  label: string;
  value: Choice;
  onChange: (v: Choice) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  otherLabel?: (typed: string) => string; // when set, shows a "not in the list" row
  boost?: (o: Option) => number; // higher = earlier (e.g. same city)
  name?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const matches = useMemo(
    () =>
      options
        .map((o) => ({ o, rank: searchScore(value.text, o.label, o.hint) }))
        .filter((x) => x.rank > 0)
        .map((x) => ({ o: x.o, rank: x.rank + (boost?.(x.o) ?? 0) }))
        .sort((a, b) => b.rank - a.rank || a.o.label.localeCompare(b.o.label))
        .slice(0, 8)
        .map((x) => x.o),
    [options, value.text, boost],
  );

  const typed = value.text.trim();
  const showOther = Boolean(otherLabel) && typed.length > 0 && !options.some((o) => o.label.toLowerCase() === typed.toLowerCase());
  const rows = matches.length + (showOther ? 1 : 0);

  function choose(i: number) {
    if (i < matches.length) onChange({ id: matches[i].id, text: matches[i].label });
    else if (showOther) onChange({ id: null, text: typed });
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(rows - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && open && rows > 0) {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const listId = `${id}-list`;
  return (
    <div className="relative text-sm font-medium">
      <label htmlFor={id}>{label}{required && " *"}</label>
      <div className="relative mt-1">
        <input
          ref={input}
          id={id}
          name={name}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && rows > 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          value={value.text}
          required={required}
          placeholder={placeholder}
          onChange={(e) => { onChange({ id: null, text: e.target.value }); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKey}
          className="w-full rounded-[8px] border border-line bg-page px-3 py-2.5 pe-9 text-sm font-normal outline-none focus:border-gold"
        />
        <ChevronDown size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
      </div>
      {open && rows > 0 && (
        <ul id={listId} role="listbox" aria-label={label} className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-[12px] border border-line bg-card p-1 shadow-lift">
          {matches.map((o, i) => (
            <li
              key={o.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={value.id === o.id}
              onMouseDown={(e) => { e.preventDefault(); choose(i); }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded-[8px] px-3 py-2 font-normal ${i === active ? "bg-hover" : ""}`}
            >
              <div>{o.label}</div>
              {o.hint && <div className="text-xs text-muted">{o.hint}</div>}
            </li>
          ))}
          {showOther && (
            <li
              id={`${id}-opt-${matches.length}`}
              role="option"
              aria-selected={value.id === null}
              onMouseDown={(e) => { e.preventDefault(); choose(matches.length); }}
              onMouseEnter={() => setActive(matches.length)}
              className={`cursor-pointer rounded-[8px] px-3 py-2 font-normal text-goldtext ${active === matches.length ? "bg-hover" : ""}`}
            >
              {otherLabel!(typed)}
            </li>
          )}
        </ul>
      )}
      {open && rows === 0 && typed === "" && null}
    </div>
  );
}
