"use client";

import { useEffect, useRef, useState } from "react";
import Dropdown, { type DOpt } from "./Dropdown";

export type PhotoHint = { skinDepth: string; undertoneHint: string; faceShape: string };

const SKIN_DD: DOpt[] = [{ v: "light", emoji: "✋🏻", label: "Light" }, { v: "medium", emoji: "✋🏽", label: "Medium" }, { v: "tan", emoji: "✋🏾", label: "Tan" }, { v: "deep", emoji: "✋🏿", label: "Deep" }];
const TONE_DD: DOpt[] = [{ v: "warm", emoji: "🔥", label: "Warm", sub: "Golden, peachy" }, { v: "cool", emoji: "❄️", label: "Cool", sub: "Pink, bluish" }, { v: "neutral", emoji: "⚖️", label: "Neutral", sub: "A mix of both" }];
const FACE_DD: DOpt[] = [{ v: "oval", emoji: "🥚", label: "Oval" }, { v: "round", emoji: "🌕", label: "Round" }, { v: "square", emoji: "⬛", label: "Square" }, { v: "heart", emoji: "💛", label: "Heart" }, { v: "oblong", emoji: "📏", label: "Oblong" }];
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
const REASONS: Record<string, string> = {
  "no-face": "We could not find a face. Try again facing the camera in daylight, or skip this step.",
  "many-faces": "We found more than one face. Use a photo of only you, or skip this step.",
  failed: "The photo could not be read on this device. You can skip this step.",
};

// The photo is read inside a web worker on this device. Only three labels leave this component.
export default function PhotoStep({ value, onChange }: { value: PhotoHint | null; onChange: (v: PhotoHint | null) => void }) {
  const worker = useRef<Worker | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [found, setFound] = useState<PhotoHint | null>(value);

  useEffect(() => () => worker.current?.terminate(), []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMsg(""); setBusy(true); onChange(null); setFound(null);
    try {
      const bitmap = await createImageBitmap(file, { resizeWidth: 640, resizeQuality: "medium" });
      worker.current ??= new Worker(new URL("../../lib/photo/worker.ts", import.meta.url), { type: "module" });
      const w = worker.current;
      w.onmessage = (e: MessageEvent) => {
        setBusy(false);
        if (e.data.ok) setFound({ skinDepth: e.data.skinDepth, undertoneHint: e.data.undertoneHint, faceShape: e.data.faceShape });
        else setMsg(REASONS[e.data.reason] ?? REASONS.failed);
      };
      w.onerror = () => { setBusy(false); setMsg(REASONS.failed); };
      w.postMessage({ bitmap }, [bitmap]);
    } catch {
      setBusy(false); setMsg(REASONS.failed);
    }
  }

  function edit(key: keyof PhotoHint, v: string) {
    if (found) setFound({ ...found, [key]: v });
  }

  return (
    <section className="card">
      <h1>A quick photo (optional)</h1>
      <p className="hint">It helps us suggest colours. Your photo is read on your phone and is never uploaded or saved.</p>
      <p className="badge">● Read on your device · never uploaded</p>

      {!found && (
        <>
          <label>Face the camera, in daylight, no filters</label>
          <input type="file" accept="image/*" capture="user" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
          {busy && <p className="hint">Reading on your device… the first time can take a few seconds.</p>}
        </>
      )}
      {msg && <p className="err" role="alert">{msg}</p>}

      {found && (
        <div>
          <p className="eyebrow">What we found · please confirm</p>
          <div className="row">
            <div><label>Skin depth</label>
              <Dropdown value={found.skinDepth} onChange={(v) => edit("skinDepth", v)} options={SKIN_DD} label="Skin depth" /></div>
            <div><label>Undertone hint</label>
              <Dropdown value={found.undertoneHint} onChange={(v) => edit("undertoneHint", v)} options={TONE_DD} label="Undertone hint" /></div>
            <div><label>Face shape</label>
              <Dropdown value={found.faceShape} onChange={(v) => edit("faceShape", v)} options={FACE_DD} label="Face shape" /></div>
          </div>
          <p className="hint">Not right? Change a value. Your size is never taken from a photo.</p>
          <div className="nav">
            <button type="button" className="primary" onClick={() => onChange(found)}>{value ? "Saved ✓" : "Looks right"}</button>
            <button type="button" className="ghost" onClick={() => { setFound(null); onChange(null); }}>Retake</button>
          </div>
        </div>
      )}
    </section>
  );
}
