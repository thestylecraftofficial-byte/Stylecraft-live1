"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

// `img` is an optional real photo (a path under /public). If the file is missing, the drawn `art` shows instead.
export type Opt = { v: string; title: string; sub?: string; art: ReactNode; img?: string };

// A grid of picture cards. Single choice by default; pass `multi` for several (with an optional max).
// One card. Shows the photo when the file exists; otherwise the drawn icon, in the normal round style.
function Card({ o, on, onPick, multi }: { o: Opt; on: boolean; onPick: () => void; multi?: boolean }) {
  const [bad, setBad] = useState(!o.img);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => { const i = ref.current; if (i && i.complete && i.naturalWidth === 0) setBad(true); }, []);
  const photo = !!o.img && !bad;
  return (
    <label className={"vc" + (on ? " on" : "") + (photo ? " photo" : "")}>
      <input type={multi ? "checkbox" : "radio"} checked={on} onChange={onPick} />
      <span className="vc-art">
        {!photo && o.art}
        {o.img && !bad && <img ref={ref} src={o.img} alt="" loading="lazy" onError={() => setBad(true)} />}
      </span>
      <span className="vc-title">{o.title}</span>
      {o.sub && <span className="vc-sub">{o.sub}</span>}
    </label>
  );
}

export function Cards({ options, value, onChange, multi, max, small, plain }: {
  options: Opt[]; value: string | string[]; onChange: (v: any) => void; multi?: boolean; max?: number; small?: boolean; plain?: boolean;
}) {
  const sel = (v: string) => (multi ? (value as string[]).includes(v) : value === v);
  return (
    <div className={"vgrid" + (small ? " small" : "") + (plain ? " plain" : "")} role={multi ? "group" : "radiogroup"}>
      {options.map((o) => (
        <Card key={o.v + (o.img ?? "")} o={o} on={sel(o.v)} multi={multi} onPick={() => {
          if (!multi) return onChange(o.v);
          const cur = value as string[];
          if (cur.includes(o.v)) onChange(cur.filter((x) => x !== o.v));
          else if (!max || cur.length < max) onChange([...cur, o.v]);
        }} />
      ))}
    </div>
  );
}

const S = ({ children }: { children: ReactNode }) => <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>{children}</svg>;
export const Unsure = <S><text x="32" y="42" textAnchor="middle" fontSize="30" fill="#8a8170" fontFamily="Georgia,serif">?</text></S>;
export const Disc = (hex: string, hex2?: string) => (
  <S>{hex2 ? (<><circle cx="24" cy="32" r="16" fill={hex} /><circle cx="40" cy="32" r="16" fill={hex2} fillOpacity=".92" /></>) : <circle cx="32" cy="32" r="28" fill={hex} stroke="rgba(0,0,0,.12)" strokeWidth="1" />}</S>
);
export const Tone = (hex: string) => <S><circle cx="32" cy="32" r="26" fill={hex} fillOpacity=".55" /><ellipse cx="32" cy="32" rx="9" ry="12" fill="none" stroke="#B8975E" strokeWidth="1.4" /></S>;
export const Head = (hair: string) => (
  <S><path d="M16 36 Q14 10 32 10 Q50 10 48 36 Q40 24 32 24 Q24 24 16 36Z" fill={hair} stroke="rgba(0,0,0,.15)" /><ellipse cx="32" cy="38" rx="12" ry="15" fill="#E8C4A0" /></S>
);
export const Eye = (iris: string) => (
  <S><path d="M6 32 Q32 8 58 32 Q32 56 6 32Z" fill="#fff" stroke="#8a8170" strokeWidth="1.5" /><circle cx="32" cy="32" r="11" fill={iris} /><circle cx="32" cy="32" r="4.5" fill="#111" /><circle cx="28" cy="28" r="2" fill="#fff" /></S>
);
export const Wrist = (c1: string, c2?: string) => (
  <S><rect x="10" y="8" width="44" height="48" rx="14" fill="#EBD3BB" /><path d="M22 14 Q28 30 24 52" fill="none" stroke={c1} strokeWidth="3.5" strokeLinecap="round" /><path d="M38 14 Q34 30 40 52" fill="none" stroke={c2 ?? c1} strokeWidth="3.5" strokeLinecap="round" /></S>
);
export const Sun = (fill: string, rays = true) => (
  <S><circle cx="32" cy="32" r="12" fill={fill} />{rays && [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
    <line key={a} x1="32" y1="9" x2="32" y2="15" stroke={fill} strokeWidth="3" strokeLinecap="round" transform={`rotate(${a} 32 32)`} />))}</S>
);
export const Ring = (c: string, c2?: string) => (
  <S>{c2 ? (<><circle cx="24" cy="34" r="13" fill="none" stroke={c} strokeWidth="5" /><circle cx="40" cy="34" r="13" fill="none" stroke={c2} strokeWidth="5" /></>) : <circle cx="32" cy="34" r="17" fill="none" stroke={c} strokeWidth="6" />}</S>
);
export const Fit = (w: number, dashed?: boolean) => (
  <S><path d={`M${32 - w / 2} 8 h${w} l4 48 h-${w + 8} Z`} fill={dashed ? "none" : "#E6DCCB"} stroke="#6b604d" strokeWidth="1.6" strokeDasharray={dashed ? "4 3" : ""} /></S>
);
export const Glyph = (d: string) => <S><path d={d} fill="none" stroke="#6b604d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></S>;

// Flat-lay garments: solid dark shapes with gold details. Used until real photos are added.
const DK = "#2B2A28", GD = "#C9A24A";
const shapes: Record<string, ReactNode> = {
  tee: <><path d="M18 14 L26 10 Q32 17 38 10 L46 14 L55 25 L46 31 L43 27 V55 H21 V27 L18 31 L9 25Z" fill={DK} /></>,
  shirt: <><path d="M18 14 L26 10 L32 18 L38 10 L46 14 L55 25 L46 31 L43 27 V55 H21 V27 L18 31 L9 25Z" fill={DK} /><path d="M32 18 V55" stroke={GD} strokeWidth="1.6" /><circle cx="32" cy="28" r="1.4" fill={GD} /><circle cx="32" cy="38" r="1.4" fill={GD} /><circle cx="32" cy="48" r="1.4" fill={GD} /><path d="M26 10 L32 18 L24 20Z M38 10 L32 18 L40 20Z" fill="#fff" fillOpacity=".9" /></>,
  blazer: <><path d="M20 9 L32 20 L44 9 L54 22 L48 55 H16 L10 22Z" fill={DK} /><path d="M32 20 L24 36 L32 55 M32 20 L40 36" stroke={GD} strokeWidth="1.8" fill="none" /><circle cx="30" cy="44" r="1.5" fill={GD} /></>,
  hoodie: <><path d="M16 15 L25 10 Q32 20 39 10 L48 15 L57 27 L48 33 L45 29 V55 H19 V29 L16 33 L7 27Z" fill={DK} /><path d="M25 10 Q32 4 39 10 Q32 22 25 10Z" fill="#454340" /><path d="M24 42 H40 L38 50 H26Z" fill="none" stroke={GD} strokeWidth="1.6" /></>,
  kurta: <><path d="M23 8 H41 L47 18 L55 24 L50 30 L46 26 L45 57 H19 L18 26 L14 30 L9 24 L17 18Z" fill={DK} /><path d="M32 9 V32" stroke={GD} strokeWidth="1.8" /><circle cx="32" cy="16" r="1.4" fill={GD} /><circle cx="32" cy="23" r="1.4" fill={GD} /><circle cx="32" cy="30" r="1.4" fill={GD} /><path d="M19 52 H45" stroke={GD} strokeWidth="1.4" strokeDasharray="2 2" /></>,
  jacket: <><path d="M17 14 L26 10 L32 14 L38 10 L47 14 L56 26 L48 31 L46 27 V46 H18 V27 L16 31 L8 26Z" fill={DK} /><path d="M32 14 V46" stroke={GD} strokeWidth="2" /></>,
  track: <><path d="M17 14 L26 10 Q32 14 38 10 L47 14 L57 40 L50 42 L46 28 V55 H18 V28 L14 42 L7 40Z" fill={DK} /><path d="M32 12 V55" stroke={GD} strokeWidth="1.6" /><path d="M16 28 L9 40 M48 28 L55 40" stroke={GD} strokeWidth="2.5" /></>,
  dress: <><path d="M24 8 H28 L32 16 L36 8 H40 L42 24 L52 56 H12 L22 24Z" fill={DK} /><path d="M22 28 H42" stroke={GD} strokeWidth="1.6" /></>,
};
export const Garment = (...kinds: string[]) => (
  <S>{kinds.length === 1 ? shapes[kinds[0]] : (<><g transform="translate(-14 4) scale(.8)">{shapes[kinds[0]]}</g><g transform="translate(26 4) scale(.8)">{shapes[kinds[1]]}</g></>)}</S>
);
export const FitShape = (w: number, dashed?: boolean) => (
  <S><path d={`M${32 - w / 2} 8 h${w} l4 48 h-${w + 8} Z`} fill={dashed ? "none" : DK} stroke={dashed ? "#8a8170" : "none"} strokeWidth="1.6" strokeDasharray={dashed ? "4 3" : ""} /><path d={`M${32 - w / 2 - 2} 52 h${w + 4}`} stroke={GD} strokeWidth="1.6" /></S>
);
