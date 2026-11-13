"use client";
import { useState } from "react";
import Dropdown, { type DOpt } from "@/app/start/Dropdown";
import { AVAILABILITY, EXPERIENCE, SPECIALITIES, STYLIST_CONSENT } from "@/lib/people";
import "./apply.css";

const EXP_EMOJI: Record<string, string> = { "under-1": "🌱", "1-3": "⭐", "3-5": "🏅", "5-plus": "👑" };
const AVAIL_EMOJI: Record<string, string> = { weekends: "🌴", weekdays: "💼", flexible: "🔄" };
const SPEC_EMOJI: Record<string, string> = { mens: "👔", womens: "👗", ethnic: "🥻", wedding: "💍", grooming: "💇" };
const EXP_DD: DOpt[] = EXPERIENCE.map(([v, l]) => ({ v, label: l, emoji: EXP_EMOJI[v] ?? "⭐" }));
const AVAIL_DD: DOpt[] = AVAILABILITY.map(([v, l]) => ({ v, label: l, emoji: AVAIL_EMOJI[v] ?? "🕒" }));
const emojiFor = (v: string) => SPEC_EMOJI[v] ?? "✨";

export default function StylistForm() {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");
  const [exp, setExp] = useState("");
  const [avail, setAvail] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setState("sending");
    const f = new FormData(e.currentTarget);
    const g = (k: string) => f.get(k);
    try {
      const res = await fetch("/api/stylists/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        name: g("name"), phone: g("phone"), email: g("email"), city: g("city"), experience: exp, specialities: f.getAll("specialities"), languages: g("languages"),
        portfolioUrl: g("portfolioUrl"), about: g("about"), availability: avail, consent: g("consent") === "on", website: g("website") }) });
      if (res.ok) setState("done"); else { setState("idle"); setErr((await res.json().catch(() => ({}))).error ?? "Please check the form and try again."); }
    } catch { setState("idle"); setErr("We could not reach the server. Check your internet and try again."); }
  }
  if (state === "done") return <section className="sf-done"><p style={{ fontSize: 34, margin: 0 }}>🎉</p><p><b>Thank you.</b> We’ve received your application and will be in touch if there’s a fit.</p></section>;
  return (
    <form className="sf" onSubmit={submit}>
      <div><label htmlFor="sf-name">Name</label><input id="sf-name" type="text" name="name" required maxLength={80} placeholder="Your full name" /></div>
      <div className="row">
        <div><label htmlFor="sf-phone">Phone (WhatsApp)</label><input id="sf-phone" type="tel" name="phone" required inputMode="tel" placeholder="+91 98765 43210" /></div>
        <div><label htmlFor="sf-email">Email</label><input id="sf-email" type="email" name="email" required maxLength={120} placeholder="you@example.com" /></div>
      </div>
      <div className="row">
        <div><label htmlFor="sf-city">City</label><input id="sf-city" type="text" name="city" required maxLength={60} placeholder="Where you work from" /></div>
        <div><label>Experience</label><Dropdown value={exp} onChange={setExp} options={EXP_DD} required label="Experience" placeholder="How long have you styled?" /></div>
      </div>
      <fieldset><legend>Specialities (pick at least one)</legend>
        <div className="pills">{SPECIALITIES.map(([v, l]) => <label key={v} className="pill"><input type="checkbox" name="specialities" value={v} /><span aria-hidden>{emojiFor(v)}</span>{l}</label>)}</div></fieldset>
      <div><label htmlFor="sf-lang">Languages you work in</label><input id="sf-lang" type="text" name="languages" maxLength={100} placeholder="Telugu, Hindi, English" /></div>
      <div><label htmlFor="sf-url">Portfolio link (optional, https://)</label><input id="sf-url" type="url" name="portfolioUrl" maxLength={300} placeholder="https://instagram.com/yourpage" /></div>
      <div><label>Availability</label><Dropdown value={avail} onChange={setAvail} options={AVAIL_DD} required label="Availability" placeholder="When can you take clients?" /></div>
      <div><label htmlFor="sf-about">About your work (optional)</label><textarea id="sf-about" name="about" maxLength={600} rows={4} placeholder="Tell us what you love styling" /></div>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
      <label className="consent"><input type="checkbox" name="consent" required /> <span>{STYLIST_CONSENT}</span></label>
      {err && <p role="alert" className="err">{err}</p>}
      <button className="go" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send application"}</button>
    </form>
  );
}
