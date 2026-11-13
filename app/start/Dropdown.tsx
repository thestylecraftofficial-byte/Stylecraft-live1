"use client";

import { useEffect, useId, useRef, useState } from "react";
import "./dropdown.css";

export type DOpt = { v: string; label: string; emoji: string; sub?: string };

// A themed dropdown with an emoji and an optional hint on every option. Works with the keyboard,
// and with a plain <form> when `name` is given (a hidden field carries the value).
export default function Dropdown({ value, onChange, options, placeholder = "Choose…", name, required, label }: {
  value: string; onChange: (v: string) => void; options: DOpt[]; placeholder?: string; name?: string; required?: boolean; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const cur = options.find((o) => o.v === value);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent | TouchEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("touchstart", away);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("touchstart", away); };
  }, [open]);

  function pick(v: string) { onChange(v); setOpen(false); }
  function key(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setHi(Math.max(0, options.findIndex((o) => o.v === value))); setOpen(true); return; }
      setHi((h) => (h + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
    } else if ((e.key === "Enter" || e.key === " ") && open) { e.preventDefault(); pick(options[hi].v); }
  }

  return (
    <div className={"dd" + (open ? " open" : "")} ref={root}>
      {name && <input type="hidden" name={name} value={value} />}
      {required && <input className="dd-req" tabIndex={-1} aria-hidden required value={value} onChange={() => {}} />}
      <button type="button" className="dd-btn" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-label={label}
        onClick={() => { setHi(Math.max(0, options.findIndex((o) => o.v === value))); setOpen(!open); }} onKeyDown={key}>
        {cur ? <><span className="dd-em" aria-hidden>{cur.emoji}</span><span className="dd-t">{cur.label}</span></> : <span className="dd-ph">{placeholder}</span>}
        <span className="dd-chev" aria-hidden>⌄</span>
      </button>
      {open && (
        <ul id={id} className="dd-list" role="listbox">
          {options.map((o, i) => (
            <li key={o.v} role="option" aria-selected={o.v === value} className={(o.v === value ? "sel " : "") + (i === hi ? "hi" : "")}
              onMouseEnter={() => setHi(i)} onClick={() => pick(o.v)}>
              <span className="dd-em" aria-hidden>{o.emoji}</span>
              <span className="dd-tx"><b>{o.label}</b>{o.sub && <small>{o.sub}</small>}</span>
              {o.v === value && <span className="dd-ck" aria-hidden>✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
