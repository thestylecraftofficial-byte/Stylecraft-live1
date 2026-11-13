"use client";

import { useEffect, useState } from "react";
import PhotoStep, { type PhotoHint } from "./PhotoStep";
import { CONSENT_ITEMS, KEEP_ANONYMOUS } from "@/lib/consent";
import {
  CATEGORIES, FITS, MEASUREMENT_FIELDS, MEASURE_RANGE_CM, OCCASIONS, PRESENTATIONS, STYLES,
} from "@/lib/schema";
import { hexFor } from "@/lib/report/colours";
import { Cards, Disc, Tone, Head, Eye, Wrist, Sun, Ring, Fit, FitShape, Garment, Glyph, Unsure, type Opt } from "./Visual";
import MeasureGuide from "./MeasureGuide";
import Dropdown, { type DOpt } from "./Dropdown";
import "./start.css";

const colourOpts: Opt[] = ["black", "white", "navy", "grey", "olive", "maroon", "beige", "brown", "blue", "green", "red", "pink", "yellow", "orange", "purple", "teal"]
  .map((c) => ({ v: c, title: c[0].toUpperCase() + c.slice(1), art: Disc(hexFor(c) ?? "#999") }));
const PRESENT: Opt[] = [
  { v: "menswear", img: "/who/menswear.jpg", title: "Menswear", sub: "Men's clothing", art: Garment("shirt") },
  { v: "womenswear", img: "/who/womenswear.jpg", title: "Womenswear", sub: "Women's clothing", art: Garment("dress") },
];
const FIT_OPTS: Opt[] = [
  { v: "slim", img: "/fit/{g}/slim.jpg", title: "Slim", sub: "Close to the body", art: FitShape(16) },
  { v: "regular", img: "/fit/{g}/regular.jpg", title: "Regular", sub: "Easy, true to size", art: FitShape(24) },
  { v: "relaxed", img: "/fit/{g}/relaxed.jpg", title: "Relaxed", sub: "Loose and airy", art: FitShape(32) },
  { v: "oversized", img: "/fit/{g}/oversized.jpg", title: "Oversized", sub: "Big, boxy, bold", art: FitShape(40) },
  { v: "not-sure", title: "Not sure", sub: "We will suggest", art: FitShape(24, true) },
];
const STYLE_OPTS: Opt[] = [
  { v: "smart-casual", img: "/styles/{g}/smart-casual.jpg", title: "Smart casual", sub: "Polished, not stiff", art: Garment("shirt") },
  { v: "classic", img: "/styles/{g}/classic.jpg", title: "Classic", sub: "Timeless, tailored", art: Garment("blazer") },
  { v: "minimal", img: "/styles/{g}/minimal.jpg", title: "Minimal", sub: "Clean and quiet", art: Garment("tee") },
  { v: "street", img: "/styles/{g}/street.jpg", title: "Street", sub: "Hoodies, sneakers", art: Garment("hoodie") },
  { v: "ethnic", img: "/styles/{g}/ethnic.jpg", title: "Ethnic", sub: "Kurtas, festive wear", art: Garment("kurta") },
  { v: "trendy", img: "/styles/{g}/trendy.jpg", title: "Trendy", sub: "What is in now", art: Garment("jacket") },
  { v: "sporty", img: "/styles/{g}/sporty.jpg", title: "Sporty", sub: "Active, athletic", art: Garment("track") },
];
const VEIN: Opt[] = [
  { v: "green", title: "Mostly green", sub: "Suggests warm", art: Wrist("#5B7F4A") },
  { v: "blue", title: "Blue / purple", sub: "Suggests cool", art: Wrist("#4A5FA8") },
  { v: "mixed", title: "Both", sub: "In between", art: Wrist("#4A5FA8", "#5B7F4A") },
  { v: "not-sure", title: "Not sure", sub: "We won't guess", art: Unsure },
];
const SUN: Opt[] = [
  { v: "tans-easily", title: "Tan easily", sub: "Rarely burn", art: Sun("#B07A45") },
  { v: "burns-then-tans", title: "Burn, then tan", sub: "Red first", art: Sun("#D9822B") },
  { v: "burns", title: "Burn", sub: "Hardly tan", art: Sun("#C9473A") },
  { v: "not-sure", title: "Not sure", sub: "That is fine", art: Unsure },
];
const JEWEL: Opt[] = [
  { v: "gold", title: "Gold", sub: "Warm metal suits", art: Ring("#D4AF37") },
  { v: "silver", title: "Silver", sub: "Cool metal suits", art: Ring("#B8BCC2") },
  { v: "both", title: "Both", sub: "Either works", art: Ring("#D4AF37", "#B8BCC2") },
  { v: "not-sure", title: "Not sure", sub: "That is fine", art: Unsure },
];
const HAIR: Opt[] = [
  { v: "black", title: "Black", sub: "Deepest natural", art: Head("#1A1A1A") },
  { v: "dark-brown", title: "Dark brown", sub: "Near-black brown", art: Head("#3B2A20") },
  { v: "brown", title: "Brown", sub: "Classic mid brown", art: Head("#6B4A35") },
  { v: "lighter", title: "Light brown+", sub: "Lighter shades", art: Head("#B38B5D") },
  { v: "not-sure", title: "Not sure", sub: "That is fine", art: Unsure },
];
const EYES: Opt[] = [
  { v: "black", title: "Black", art: Eye("#1A1A1A") },
  { v: "dark-brown", title: "Dark brown", art: Eye("#3B2A20") },
  { v: "brown", title: "Brown", art: Eye("#6B4A35") },
  { v: "lighter", title: "Hazel / green / blue / grey", art: Eye("#8C8A5A") },
  { v: "not-sure", title: "Not sure", art: Unsure },
];
void Tone;

type MField = (typeof MEASUREMENT_FIELDS)[number];
const MEASURE_INFO: Record<MField, { name: string; tip: string; y: number }> = {
  height: { name: "Height", tip: "Stand straight, barefoot, back against a wall. Measure from the floor to the top of your head.", y: 0 },
  shoulder: { name: "Shoulder width", tip: "Across your back, from the bony edge of one shoulder to the bony edge of the other.", y: 62 },
  chest_or_bust: { name: "Chest / bust", tip: "Around the fullest part of your chest, under the arms, with the tape level and snug, not tight.", y: 88 },
  waist: { name: "Waist", tip: "Around your natural waist, the narrowest part of your torso, usually just above the belly button.", y: 128 },
  hips: { name: "Hips", tip: "Around the fullest part of your hips and seat, with your feet together.", y: 160 },
  inseam: { name: "Inseam", tip: "Inside of the leg, from the crotch down to the ankle bone. Easiest to measure on trousers that fit you well.", y: 230 },
};
const CM_PER_IN = 2.54;
const inUnit = (cm: number, unit: "cm" | "in") => (unit === "cm" ? cm : Math.round(cm / CM_PER_IN));


const COLOURS = ["black", "white", "navy", "grey", "olive", "maroon", "beige", "brown", "blue", "green", "red", "pink", "yellow", "orange", "purple", "teal"];
const NICE: Record<string, string> = {
  "18-24": "18 to 24", "25-30": "25 to 30", "31-40": "31 to 40", "41-50": "41 to 50", "51+": "51 and above",
  "under-1500": "Under ₹1,500", "1500-3000": "₹1,500 to ₹3,000", "3000-6000": "₹3,000 to ₹6,000", "6000-plus": "₹6,000 and above",
  "western-men": "Western wear, men", "western-women": "Western wear, women", "ethnic-men": "Ethnic wear, men", "ethnic-women": "Ethnic wear, women",
  "wedding-guest": "Wedding guest",
};
const label = (s: string) => NICE[s] ?? s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

function Dot({ hex }: { hex: string }) {
  return <span aria-hidden style={{ width: 16, height: 16, borderRadius: "50%", background: hex, border: "1px solid rgba(0,0,0,.25)", display: "inline-block", flex: "none" }} />;
}

// Single-choice chips with an optional colour dot and a short explanation, used for the undertone questions.
function Pick({ options, value, onChange }: { options: { v: string; text: string; hex?: string; hex2?: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <label key={o.v} className={"chip" + (value === o.v ? " on" : "")}>
          <input type="radio" checked={value === o.v} onChange={() => onChange(o.v)} />
          {o.hex && <Dot hex={o.hex} />}{o.hex2 && <Dot hex={o.hex2} />}
          {o.text}
        </label>
      ))}
    </div>
  );
}

function Chips({ options, value, onChange, max, swatch }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; max?: number; swatch?: (o: string) => string | undefined }) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <label key={o} className={"chip" + (on ? " on" : "")}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => {
                if (on) onChange(value.filter((v) => v !== o));
                else if (!max || value.length < max) onChange([...value, o]);
              }}
            />
            {swatch?.(o) && <Dot hex={swatch(o)!} />}
            {label(o)}
          </label>
        );
      })}
    </div>
  );
}

const AGE_DD: DOpt[] = [
  { v: "18-24", emoji: "🌱", label: "18 to 24" }, { v: "25-30", emoji: "🌟", label: "25 to 30" }, { v: "31-40", emoji: "💼", label: "31 to 40" },
  { v: "41-50", emoji: "🏆", label: "41 to 50" }, { v: "51+", emoji: "👑", label: "51 and above" },
];
const CITY_DD: DOpt[] = [
  { v: "metro", emoji: "🏙️", label: "Big city", sub: "Metro areas and large cities" },
  { v: "other-city", emoji: "🌆", label: "Other city", sub: "Tier-2 and tier-3 cities" },
  { v: "town", emoji: "🏡", label: "Town or village", sub: "Smaller places" },
  { v: "outside-india", emoji: "🌍", label: "Outside India" },
];
const BUDGET_DD: DOpt[] = [
  { v: "under-1500", emoji: "💸", label: "Under ₹1,500", sub: "Smart and simple" },
  { v: "1500-3000", emoji: "🛍️", label: "₹1,500 to ₹3,000", sub: "Everyday quality" },
  { v: "3000-6000", emoji: "💎", label: "₹3,000 to ₹6,000", sub: "Premium pieces" },
  { v: "6000-plus", emoji: "👑", label: "₹6,000 and above", sub: "Luxury and occasion wear" },
];
const SKIN_OPTS: Opt[] = [
  { v: "fair", title: "Fair", sub: "Very light", art: Disc("#F3D9C4") },
  { v: "light", title: "Light", sub: "Light wheatish", art: Disc("#E8BE9C") },
  { v: "wheatish", title: "Wheatish", sub: "Medium", art: Disc("#D2A074") },
  { v: "olive", title: "Olive", sub: "Greenish tan", art: Disc("#B98B5B") },
  { v: "brown", title: "Brown", sub: "Rich brown", art: Disc("#8D5E3C") },
  { v: "deep", title: "Deep", sub: "Dark", art: Disc("#5A3825") },
  { v: "not-sure", title: "Not sure", sub: "That is fine", art: Unsure },
];
const categoriesFor = (pres: string) => CATEGORIES.filter((c) => pres === "menswear" ? !c.endsWith("-women") : pres === "womenswear" ? !c.endsWith("-men") : false);

const STEPS = ["Basics", "Style", "Measures", "Photo", "Almost done"] as const;

export default function Start() {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({
    ageRange: "", presentation: "", cityZone: "", fitPreference: "", budgetBand: "",
    occasions: [] as string[], stylePrefs: [] as string[], likedColours: [] as string[],
    dislikedColours: [] as string[], categories: [] as string[],
  });
  const [m, setM] = useState<Record<string, { value: string; unsure: boolean }>>(
    Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f, { value: "", unsure: false }]))
  );
  // Photos follow who the report is for: menswear shows men's looks, womenswear women's, mixed a unisex set.
  const who = p.presentation === "womenswear" ? "women" : p.presentation === "menswear" ? "men" : "unisex";
  const forWho = (o: Opt[]) => o.map((x) => (x.img ? { ...x, img: x.img.replace("{g}", who) } : x));
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [focus, setFocus] = useState<MField | null>(null);
  const [u, setU] = useState({ skinTone: "", veins: "", sun: "", jewellery: "", hair: "", eyes: "" });
  const [photoHint, setPhotoHint] = useState<PhotoHint | null>(null);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [keepAnonymous, setKeepAnonymous] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null); // set once details are saved, so a retry does not save twice
  // Only a link made in /admin (?t=...) can start a report.
  const [gate, setGate] = useState<{ state: "loading" } | { state: "open"; code: string; firstName: string; remaining: number } | { state: "blocked"; reason: string }>({ state: "loading" });
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("t") ?? "";
    fetch(`/api/test-link?t=${encodeURIComponent(code)}`).then((r) => r.json()).then((j) => {
      if (j.valid) setGate({ state: "open", code, firstName: j.firstName, remaining: j.remaining });
      else setGate({ state: "blocked", reason: j.reason });
    }).catch(() => setGate({ state: "blocked", reason: "error" }));
  }, []);
  const link = gate.state === "open" ? gate : null;

  function check(s: number): string {
    if (s === 0) {
      if (!p.ageRange || !p.presentation || !p.cityZone) return "Please answer all three questions.";
      if (!p.categories.length) return "Pick at least one clothing category.";
    }
    if (s === 1) {
      if (!p.occasions.length) return "Pick at least one occasion.";
      if (!p.stylePrefs.length) return "Pick at least one style.";
      if (!p.fitPreference || !p.budgetBand) return "Choose a fit and a budget.";
    }
    if (s === 2) {
      for (const f of MEASUREMENT_FIELDS) {
        if (m[f].unsure || m[f].value === "") continue;
        const cm = unit === "cm" ? Number(m[f].value) : Number(m[f].value) * CM_PER_IN;
        const [lo, hi] = MEASURE_RANGE_CM[f];
        if (!(cm >= lo && cm <= hi)) return `${MEASURE_INFO[f].name} looks off. Usual range is ${inUnit(lo, unit)}–${inUnit(hi, unit)} ${unit}. Check the number and the unit, or tick “Not sure”.`;
      }
    }
    if (s === 2 && Object.values(u).some((v) => !v)) return "Answer each colour question, or choose “Not sure”.";
    return "";
  }

  function next() {
    const msg = check(step);
    setError(msg);
    if (!msg) { setStep(step + 1); window.scrollTo(0, 0); }
  }
  function back() { setError(""); setStep(step - 1); window.scrollTo(0, 0); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    for (let s = 0; s < STEPS.length - 1; s++) {
      const msg = check(s);
      if (msg) { setStep(s); setError(msg); return; }
    }
    setState("sending");
    try {
      let id = profileId;
      if (!id) {
        const measurements = Object.fromEntries(
          MEASUREMENT_FIELDS.map((f) => [f, { value: m[f].unsure || m[f].value === "" ? null : Math.round((unit === "cm" ? Number(m[f].value) : Number(m[f].value) * CM_PER_IN) * 10) / 10, unsure: m[f].unsure || m[f].value === "" }])
        );
        const res = await fetch("/api/intake", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ testCode: link?.code, profile: { ...p, measurements, undertone: u, photoHint }, consent: { accepted, keepAnonymous } }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Something went wrong");
        }
        const j = await res.json();
        id = j.profileId as string;
        setProfileId(id);
        window.location.href = `/r/${j.token}`; return; // straight to the report
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("idle");
    }
  }

  if (gate.state === "loading") return <main><p className="hint">Loading…</p></main>;
  if (gate.state === "blocked")
    return (
      <main>
        <p className="eyebrow">StyleCraft</p>
        <h1>{gate.reason === "expired" ? "This link has expired" : gate.reason === "used" ? "This link has been used up" : gate.reason === "error" ? "We could not check your link" : "You need your personal link"}</h1>
        {gate.reason === "error"
          ? <p>This is a problem on our side, not with your link. Please refresh this page in a minute. If it still does not work, message us on Instagram.</p>
          : <p>Your style report starts from a personal link that we send you. Each link works for 24 hours and gives one report, plus one redo if you made a mistake. Message us for a new link.</p>}
        <p><a href="https://www.instagram.com/thestyle.craft/" target="_blank" rel="noopener noreferrer">Message us on Instagram @thestyle.craft</a></p>
      </main>
    );
  const last = step === STEPS.length - 1;
  return (
    <main className="sc">
      <p className="eyebrow">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
      <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
        <div style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      {link && <div className="welcome"><p style={{ margin: 0 }}><b>Hi {link.firstName}, welcome to StyleCraft.</b> Your link gives you {link.remaining === 1 ? "one report" : "one report and one redo"}, so double-check your answers before you submit. Please be honest in the feedback at the end.</p></div>}
      <form onSubmit={submit}>
        {step === 0 && (
          <section className="card">
            <h1>Let’s start with the basics</h1>
            <label className="q">Style me for</label>
            <Cards options={PRESENT} value={p.presentation} onChange={(v) => setP({ ...p, presentation: v, categories: p.categories.filter((c) => categoriesFor(v).includes(c as never)) })} />
            <label className="q">Age range</label>
            <Dropdown value={p.ageRange} onChange={(v) => setP({ ...p, ageRange: v })} options={AGE_DD} label="Age range" />
            <label className="q">Where are you based?</label>
            <Dropdown value={p.cityZone} onChange={(v) => setP({ ...p, cityZone: v })} options={CITY_DD} label="Where are you based" />
            <label className="q">Clothing you want to see</label>
            {p.presentation
              ? <Chips options={categoriesFor(p.presentation)} value={p.categories} onChange={(v) => setP({ ...p, categories: v })} />
              : <p className="qs">Choose who we are styling above, and the matching clothing options will appear here.</p>}
          </section>
        )}

        {step === 1 && (
          <section className="card">
            <h1>Your style</h1>
            <label className="q">What do you dress for?</label>
            <Chips options={OCCASIONS} value={p.occasions} onChange={(v) => setP({ ...p, occasions: v })} />
            <label className="q">Styles you like</label>
            <p className="qs">Pick up to 4.</p>
            <Cards multi max={4} options={forWho(STYLE_OPTS)} value={p.stylePrefs} onChange={(v) => setP({ ...p, stylePrefs: v })} />
            <label className="q">Colours you like</label>
            <p className="qs">Up to 8.</p>
            <Cards multi small plain max={8} options={colourOpts} value={p.likedColours} onChange={(v) => setP({ ...p, likedColours: v })} />
            <label className="q">Colours you avoid</label>
            <p className="qs">Up to 8.</p>
            <Cards multi small plain max={8} options={colourOpts} value={p.dislikedColours} onChange={(v) => setP({ ...p, dislikedColours: v })} />
            <label className="q">How do you like your clothes to fit?</label>
            <Cards options={forWho(FIT_OPTS)} value={p.fitPreference} onChange={(v) => setP({ ...p, fitPreference: v })} />
            <label className="q">Budget per piece</label>
            <Dropdown value={p.budgetBand} onChange={(v) => setP({ ...p, budgetBand: v })} options={BUDGET_DD} label="Budget per piece" />
          </section>
        )}

        {step === 2 && (
          <>
            <section className="card">
              <h1>Your measurements</h1>
              <p className="hint">Sizes come only from what you enter here, never from a photo. Use a soft tape measure. Tick “Not sure” if you have not measured.</p>
              <div className="chips" role="group" aria-label="Unit" style={{ marginBottom: 12 }}>
                {(["cm", "in"] as const).map((x) => (
                  <label key={x} className={"chip" + (unit === x ? " on" : "")}>
                    <input type="radio" name="unit" checked={unit === x} onChange={() => {
                      if (x === unit) return;
                      // convert numbers already typed so nothing is lost when switching
                      setM(Object.fromEntries(MEASUREMENT_FIELDS.map((f) => {
                        const v = m[f].value; const n = Number(v);
                        const conv = v === "" || !isFinite(n) ? v : String(x === "in" ? Math.round((n / CM_PER_IN) * 10) / 10 : Math.round(n * CM_PER_IN * 10) / 10);
                        return [f, { ...m[f], value: conv }];
                      })));
                      setUnit(x);
                    }} />
                    {x === "cm" ? "Centimetres (cm)" : "Inches (in)"}
                  </label>
                ))}
              </div>
              <div className="mgrid">
                <MeasureGuide who={p.presentation === "womenswear" ? "women" : "men"} active={focus} onPick={(k) => { setFocus(k); document.getElementById(`m-${k}`)?.focus(); }}
                  rangeText={(k) => `${inUnit(MEASURE_RANGE_CM[k][0], unit)}–${inUnit(MEASURE_RANGE_CM[k][1], unit)} ${unit}`} />
                <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
                  {MEASUREMENT_FIELDS.map((f) => {
                    const [lo, hi] = MEASURE_RANGE_CM[f];
                    return (
                      <div key={f} className={"mfield" + (focus === f ? " on" : "")} onFocus={() => setFocus(f)} onClick={() => setFocus(f)}>
                        <label htmlFor={`m-${f}`}>{f === "chest_or_bust" ? (p.presentation === "womenswear" ? "Bust" : "Chest") : MEASURE_INFO[f].name} ({unit})</label>
                        <input id={`m-${f}`} type="number" inputMode="decimal" min={inUnit(lo, unit)} max={inUnit(hi, unit)} step="0.5"
                          placeholder={`${inUnit(lo, unit)}–${inUnit(hi, unit)}`} value={m[f].value} disabled={m[f].unsure}
                          onChange={(e) => setM({ ...m, [f]: { ...m[f], value: e.target.value } })} />
                        <p className="hint" style={{ margin: "4px 0" }}>Usual range {inUnit(lo, unit)}–{inUnit(hi, unit)} {unit}. {focus === f ? "" : "Tap the box to see how."}</p>
                        <label className="hint" style={{ fontWeight: 400 }}>
                          <input type="checkbox" checked={m[f].unsure} onChange={(e) => setM({ ...m, [f]: { value: "", unsure: e.target.checked } })} /> Not sure
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
            <section className="card">
              <h3>Skin undertone</h3>
              <p className="hint">These help find your best colours. “Not sure” is fine.</p>
              <label className="q">Your skin tone</label>
              <p className="qs">Pick the shade closest to the inside of your arm, in daylight.</p>
              <Cards options={SKIN_OPTS} value={u.skinTone} onChange={(v) => setU({ ...u, skinTone: v })} />
              <label className="q">Vein colour on your wrist</label>
              <p className="qs">Look in daylight, on the inside of your wrist.</p>
              <Cards options={VEIN} value={u.veins} onChange={(v) => setU({ ...u, veins: v })} />
              <label className="q">In the sun you…</label>
              <Cards options={SUN} value={u.sun} onChange={(v) => setU({ ...u, sun: v })} />
              <label className="q">Which jewellery suits you?</label>
              <Cards options={JEWEL} value={u.jewellery} onChange={(v) => setU({ ...u, jewellery: v })} />
              <label className="q">Natural hair colour</label>
              <p className="qs">Without dye. Not sure is available.</p>
              <Cards options={HAIR} value={u.hair} onChange={(v) => setU({ ...u, hair: v })} />
              <label className="q">Eye colour</label>
              <Cards options={EYES} value={u.eyes} onChange={(v) => setU({ ...u, eyes: v })} />
            </section>
          </>
        )}

        {step === 3 && <PhotoStep value={photoHint} onChange={setPhotoHint} />}

        {step === 4 && (
          <>
            <section className="card"><h1>Almost done</h1><p>No name or phone number is needed. Just read the consent below and tick the boxes.</p></section>
            <section className="card">
              <p className="eyebrow">Your consent · <a href="/privacy" target="_blank">read the privacy notice</a></p>
              {CONSENT_ITEMS.map((c) => (
                <label key={c.id} style={{ fontWeight: 400 }}>
                  <input type="checkbox" checked={accepted.includes(c.id)}
                    onChange={(e) => setAccepted(e.target.checked ? [...accepted, c.id] : accepted.filter((x) => x !== c.id))} /> {c.text}
                </label>
              ))}
              <hr />
              <label style={{ fontWeight: 400 }}>
                <input type="checkbox" checked={keepAnonymous} onChange={(e) => setKeepAnonymous(e.target.checked)} /> {KEEP_ANONYMOUS.text}
              </label>
            </section>
          </>
        )}

        {error && <p className="err" role="alert">{error}</p>}
        <div className="nav">
          {step > 0 && <button type="button" className="ghost" onClick={back}>Back</button>}
          {step === 3 && !photoHint && <button type="button" className="ghost" onClick={next}>Skip the photo</button>}
          {last ? (
            <button className="primary" disabled={state === "sending"}>{state === "sending" ? "Please wait…" : "Get my report"}</button>
          ) : (
            <button type="button" className="primary" onClick={next} hidden={step === 3 && !photoHint}>Continue</button>
          )}
        </div>
      </form>
    </main>
  );
}
