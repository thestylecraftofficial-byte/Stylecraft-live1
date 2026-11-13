"use client";

import { useState } from "react";
import { OCCASIONS } from "@/lib/schema";
import Dropdown, { type DOpt } from "@/app/start/Dropdown";

const label = (s: string) => s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

// Shrinks the photo and re-saves it as JPEG on the device before upload. This also drops camera metadata.
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail()), "image/jpeg", 0.85));
}

const OCC_EMOJI: Record<string, string> = { everyday: "👕", office: "💼", parties: "🎉", formal: "🤵", "wedding-guest": "💒", festival: "🪔", date: "❤️", interview: "🎯" };
const OCC_DD: DOpt[] = OCCASIONS.map((o) => ({ v: o, emoji: OCC_EMOJI[o] ?? "✨", label: label(o) }));

export default function CheckForm({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [occasion, setOccasion] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!file || !occasion || !consent) { setError("Add a photo, choose an occasion and tick the box."); return; }
    setState("sending");
    try {
      const fd = new FormData();
      fd.set("token", token); fd.set("occasion", occasion); fd.set("consent", "yes");
      fd.set("photo", await shrink(file), "outfit.jpg");
      const res = await fetch("/api/check", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not upload.");
      setState("done");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload."); setState("idle");
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <label>Your outfit photo</label>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <label>What is it for?</label>
      <Dropdown value={occasion} onChange={setOccasion} options={OCC_DD} label="What is it for" />
      <label style={{ fontWeight: 400, marginTop: 14 }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I agree that StyleCraft stores this photo privately, that a person at StyleCraft will look at it (it is not sent to any AI), and that it is deleted after 7 days.
      </label>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="primary" disabled={state !== "idle"}>{state === "sending" ? "Uploading…" : "Send for my check"}</button>
    </form>
  );
}
