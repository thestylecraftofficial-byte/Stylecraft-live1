"use client";
import { useRef, useState } from "react";

// A read-only box with a Copy button. Falls back to selecting the text if the browser refuses clipboard access.
export default function CopyField({ value, label = "Copy" }: { value: string; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000); }
    catch { ref.current?.select(); }
  }
  return (
    <div className="ad-copy">
      <input ref={ref} readOnly value={value} onFocus={(e) => e.currentTarget.select()} aria-label="Link" />
      <button type="button" onClick={copy}>{done ? "Copied ✓" : label}</button>
    </div>
  );
}
