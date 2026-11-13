import type { Profile } from "../schema";
import type { Limits } from "../rules/engine";
import { hexFor, prettyColour } from "./colours";
import type { Swatch } from "./types";

const NEUTRALS = ["navy", "charcoal", "grey", "white", "beige", "cream", "black", "brown", "camel"];
const ACCENTS = ["mustard", "terracotta", "rust", "emerald", "burgundy", "teal", "orange", "maroon", "purple", "lavender", "pink", "royal-blue", "blue"];

export const swatch = (c: string): Swatch => ({ name: prettyColour(c), hex: hexFor(c) });
export const OFF_PALETTE_POOL = ["red", "pink", "yellow", "orange", "purple", "green", "blue", "teal", "maroon", "brown", "olive", "beige", "grey", "black", "white", "navy"];

// Colours to avoid: what the undertone analysis rules out first, then colours outside the palette, then the customer's own dislikes (labelled as theirs).
export function avoidList(p: Profile, limits: Limits): Swatch[] {
  const liked = new Set(p.likedColours.map((c) => c.toLowerCase()));
  const disliked = new Set(p.dislikedColours.map((c) => c.toLowerCase()));
  const inPalette = new Set(limits.paletteWear);
  const out: Swatch[] = [];
  const seen = new Set<string>();
  const add = (c: string, why: string) => {
    if (seen.has(c)) return;
    seen.add(c);
    out.push({ ...swatch(c), why: disliked.has(c) ? (why === "You said you avoid this" ? why : why + ", and you avoid it too") : why });
  };
  limits.ruleAvoid.forEach((c) => add(c, `Clashes with your ${limits.undertone} undertone`));
  OFF_PALETTE_POOL.filter((c) => !inPalette.has(c) && !liked.has(c) && !limits.ruleAvoid.includes(c)).slice(0, Math.max(0, 4 - out.length)).forEach((c) => add(c, "Outside your palette"));
  [...disliked].forEach((c) => add(c, "You said you avoid this"));
  return out.slice(0, 6);
}

// Primary, secondary, accent and neutral colours drawn from the rule-approved palette, favouring colours the customer likes.
export function colourRoles(p: Profile, limits: Limits) {
  const liked = new Set(p.likedColours.map((c) => c.toLowerCase()));
  const wear = limits.wearColours;
  const byLike = () => 0; // the analysis decides the order; likes are only flagged on the swatch
  const neutral = wear.filter((c) => NEUTRALS.includes(c)).sort(byLike).slice(0, 4);
  const rest = wear.filter((c) => !neutral.includes(c));
  const primary = [...rest].sort(byLike).slice(0, 2);
  const left = rest.filter((c) => !primary.includes(c));
  const secondary = left.slice(0, 2);
  const accentPool = left.filter((c) => !secondary.includes(c));
  const accent = (accentPool.filter((c) => ACCENTS.includes(c)).length ? accentPool.filter((c) => ACCENTS.includes(c)) : accentPool).slice(0, 2);
  const sw = (c: string): Swatch => (liked.has(c) ? { ...swatch(c), why: "You like this" } : swatch(c));
  const roles = { primary: primary.map(sw), secondary: secondary.map(sw), accent: accent.map(sw), neutral: neutral.map(sw) };

  const pick = (a: Swatch[], i: number) => a[i] ?? a[0];
  const mk = (name: string, parts: (Swatch | undefined)[]) => {
    const seen = new Set<string>();
    return { name, colours: parts.filter((x): x is Swatch => !!x && !seen.has(x.name) && !!seen.add(x.name)) };
  };
  const combos = [
    mk("Everyday", [pick(roles.neutral, 0), pick(roles.primary, 0), pick(roles.neutral, 1)]),
    mk("Smart", [pick(roles.neutral, 1), pick(roles.primary, 1), pick(roles.secondary, 0)]),
    mk("Statement", [pick(roles.neutral, 2), pick(roles.secondary, 1) ?? pick(roles.primary, 0), pick(roles.accent, 0)]),
  ].filter((c) => c.colours.length >= 2);
  return { roles, combos };
}
