"use client";

import { useEffect, useState } from "react";

export type MKey = "height" | "shoulder" | "chest_or_bust" | "waist" | "hips" | "inseam";
type Who = "men" | "women";

// Where each tape goes on the two figures (the figure is 200 wide, 450 tall, centred on x = 100).
// hw = half the body's width at that height, so the tape wraps just outside it.
const FIG: Record<Who, { shoulder: [number, number]; chest_or_bust: [number, number]; waist: [number, number]; hips: [number, number]; crotch: number }> = {
  men:   { shoulder: [86, 56], chest_or_bust: [134, 49], waist: [196, 41], hips: [246, 46], crotch: 276 },
  women: { shoulder: [86, 45], chest_or_bust: [130, 42], waist: [190, 31], hips: [246, 51], crotch: 272 },
};

// The outline of the torso as [y, half-width] pairs, mirrored left and right.
const TORSO: Record<Who, [number, number][]> = {
  men:   [[64, 14], [76, 30], [84, 54], [100, 54], [134, 48], [170, 44], [196, 40], [226, 42], [246, 46], [276, 46]],
  women: [[64, 12], [76, 26], [84, 44], [100, 42], [130, 41], [160, 34], [190, 30], [220, 40], [246, 50], [272, 48]],
};

function torsoPath(who: Who) {
  const pts = TORSO[who];
  const right = pts.map(([y, hw]) => `${100 + hw},${y}`);
  const left = [...pts].reverse().map(([y, hw]) => `${100 - hw},${y}`);
  return `M${right.join(" L")} L${left.join(" L")} Z`;
}

export const STEPS: Record<MKey, { title: string; men: string[]; women: string[] }> = {
  height: {
    title: "Height",
    men: ["Stand barefoot with your back flat against a wall.", "Look straight ahead and keep your heels together.", "Mark the top of your head, then measure from the floor to the mark."],
    women: ["Stand barefoot with your back flat against a wall.", "Look straight ahead and keep your heels together.", "Mark the top of your head, then measure from the floor to the mark."],
  },
  shoulder: {
    title: "Shoulder width",
    men: ["Stand relaxed with your arms by your sides.", "Find the bony point at the edge of each shoulder.", "Measure straight across your back between the two points."],
    women: ["Stand relaxed with your arms by your sides.", "Find the bony point at the edge of each shoulder.", "Measure straight across your back between the two points."],
  },
  chest_or_bust: {
    title: "Chest",
    men: ["Stand relaxed and breathe out normally.", "Pass the tape under your arms and across the fullest part of your chest.", "Keep it level at the back and snug, not tight."],
    women: ["Wear a thin, well-fitting bra and breathe out normally.", "Pass the tape under your arms and across the fullest part of your bust.", "Keep it level at the back and snug, not tight."],
  },
  waist: {
    title: "Waist",
    men: ["Find your natural waist: the narrowest part, just above the belly button.", "Wrap the tape around it without pulling in your stomach.", "Keep the tape level and snug."],
    women: ["Find your natural waist: the narrowest part of your torso.", "Wrap the tape around it without pulling in your stomach.", "Keep the tape level and snug."],
  },
  hips: {
    title: "Hips",
    men: ["Stand with your feet together.", "Wrap the tape around the fullest part of your hips and seat.", "Check in a mirror that the tape is level all the way round."],
    women: ["Stand with your feet together.", "Wrap the tape around the fullest part of your hips and seat.", "Check in a mirror that the tape is level all the way round."],
  },
  inseam: {
    title: "Inseam",
    men: ["Easiest on trousers that fit you well: lay them flat.", "Measure the inside seam from the crotch down to the hem.", "Or measure your own inner leg from the crotch to the ankle bone."],
    women: ["Easiest on trousers that fit you well: lay them flat.", "Measure the inside seam from the crotch down to the hem.", "Or measure your own inner leg from the crotch to the ankle bone."],
  },
};

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => { try { setR(matchMedia("(prefers-reduced-motion: reduce)").matches); } catch { /* keep animations */ } }, []);
  return r;
}

const RED = "#B3342B";

function Figure({ who, active, onPick, still }: { who: Who; active: MKey | null; onPick: (k: MKey) => void; still: boolean }) {
  const f = FIG[who];
  const body = "#E6DECF";
  const wrap = (k: "chest_or_bust" | "waist" | "hips") => {
    const [y, hw] = f[k]; const rx = hw + 6, ry = 9;
    const on = active === k;
    const full = `M${100 - rx},${y} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0`;
    return (
      <g key={k} onClick={() => onPick(k)} style={{ cursor: "pointer" }}>
        <ellipse cx="100" cy={y} rx={rx} ry={ry} fill="none" stroke={on ? RED : "#A59C8A"} strokeWidth={on ? 4 : 1.6} strokeDasharray={on ? "" : "4 4"} className={on ? "mg-wrap" : ""} />
        {on && <ellipse cx="100" cy={y} rx={rx} ry={ry} fill="none" stroke="#fff" strokeWidth="1.2" strokeDasharray="1.5 7" opacity=".9" />}
        {on && !still && <circle r="5.5" fill={RED} stroke="#fff" strokeWidth="1.5"><animateMotion dur="3.2s" repeatCount="indefinite" path={full} /></circle>}
        <rect x={100 - rx - 6} y={y - 14} width={rx * 2 + 12} height="28" fill="transparent" />
      </g>
    );
  };
  const vline = (k: "height" | "inseam", x: number, y1: number, y2: number) => {
    const on = active === k;
    return (
      <g key={k} onClick={() => onPick(k)} style={{ cursor: "pointer" }}>
        <line x1={x} x2={x} y1={y1} y2={y2} stroke={on ? RED : "#A59C8A"} strokeWidth={on ? 4 : 1.6} strokeDasharray={on ? "" : "4 4"} strokeLinecap="round" />
        {on && <>
          <line x1={x - 9} x2={x + 9} y1={y1} y2={y1} stroke={RED} strokeWidth="3" strokeLinecap="round" />
          <line x1={x - 9} x2={x + 9} y1={y2} y2={y2} stroke={RED} strokeWidth="3" strokeLinecap="round" />
          {!still && <circle cx={x} r="6" fill={RED} stroke="#fff" strokeWidth="1.5"><animate attributeName="cy" values={`${y1};${y2};${y1}`} dur="3s" repeatCount="indefinite" /></circle>}
        </>}
        <rect x={x - 12} y={y1} width="24" height={y2 - y1} fill="transparent" />
      </g>
    );
  };
  const sy = f.shoulder[0], sx1 = 100 - f.shoulder[1], sx2 = 100 + f.shoulder[1];
  const sOn = active === "shoulder";
  return (
    <svg viewBox="0 0 200 450" className="mg-svg" role="img" aria-label={`${who === "men" ? "Male" : "Female"} body outline showing where to measure`}>
      {who === "women" && <path d="M78 22 C66 40 64 80 74 96 L88 56 Z M122 22 C134 40 136 80 126 96 L112 56 Z" fill="#CFC4AF" />}
      <circle cx="100" cy="34" r="20" fill={body} />
      <rect x="92" y="50" width="16" height="18" fill={body} />
      <path d={torsoPath(who)} fill={body} stroke={body} strokeWidth="6" strokeLinejoin="round" />
      <line x1={who === "men" ? 52 : 56} y1="94" x2="36" y2="230" stroke={body} strokeWidth="19" strokeLinecap="round" />
      <line x1={who === "men" ? 148 : 144} y1="94" x2="164" y2="230" stroke={body} strokeWidth="19" strokeLinecap="round" />
      <path d={`M${100 - (who === "men" ? 46 : 48)},${f.crotch - 6} L${100 - 3},${f.crotch - 6} L${100 - 8},430 L${100 - 30},430 Z`} fill={body} stroke={body} strokeWidth="4" strokeLinejoin="round" />
      <path d={`M${100 + (who === "men" ? 46 : 48)},${f.crotch - 6} L${100 + 3},${f.crotch - 6} L${100 + 8},430 L${100 + 30},430 Z`} fill={body} stroke={body} strokeWidth="4" strokeLinejoin="round" />
      <line x1="20" x2="180" y1="432" y2="432" stroke="#C9BFA8" strokeWidth="2" />
      <g onClick={() => onPick("shoulder")} style={{ cursor: "pointer" }}>
        <line x1={sx1} x2={sx2} y1={sy} y2={sy} stroke={sOn ? RED : "#A59C8A"} strokeWidth={sOn ? 4 : 1.6} strokeDasharray={sOn ? "" : "4 4"} strokeLinecap="round" />
        {sOn && <>
          <line x1={sx1} x2={sx1} y1={sy - 9} y2={sy + 9} stroke={RED} strokeWidth="3" strokeLinecap="round" />
          <line x1={sx2} x2={sx2} y1={sy - 9} y2={sy + 9} stroke={RED} strokeWidth="3" strokeLinecap="round" />
          {!still && <circle cy={sy} r="6" fill={RED} stroke="#fff" strokeWidth="1.5"><animate attributeName="cx" values={`${sx1};${sx2};${sx1}`} dur="3s" repeatCount="indefinite" /></circle>}
        </>}
        <rect x={sx1 - 6} y={sy - 12} width={sx2 - sx1 + 12} height="24" fill="transparent" />
      </g>
      {wrap("chest_or_bust")}{wrap("waist")}{wrap("hips")}
      {vline("height", 186, 14, 432)}
      {vline("inseam", 100 - 12, f.crotch, 428)}
    </svg>
  );
}

// A guide that sits beside the measurement boxes. It shows a figure that matches who the report is for, and when a box is
// selected it draws a moving tape where that measurement is taken, with the steps in words underneath.
export default function MeasureGuide({ who, active, onPick, rangeText }: { who: Who; active: MKey | null; onPick: (k: MKey) => void; rangeText: (k: MKey) => string }) {
  const still = useReducedMotion();
  const s = active ? STEPS[active] : null;
  const title = s ? (active === "chest_or_bust" ? (who === "women" ? "Bust" : "Chest") : s.title) : "How to measure";
  return (
    <aside className="mg" aria-live="polite">
      <Figure who={who} active={active} onPick={onPick} still={still} />
      <div className="mg-text">
        <p className="mg-eyebrow">{who === "women" ? "Women's guide" : "Men's guide"}</p>
        <h4>{title}</h4>
        {s && active ? (
          <>
            <ol>{(who === "women" ? s.women : s.men).map((t, i) => <li key={i}>{t}</li>)}</ol>
            <p className="mg-range">Usual range: {rangeText(active)}</p>
          </>
        ) : <p className="mg-idle">Tap any box on the right and we will show you, with a moving tape, exactly where to measure. You can also tap a line on the figure.</p>}
      </div>
    </aside>
  );
}
