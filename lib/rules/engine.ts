// StyleCraft rule engine v1. Pure functions, no network. The AI may only draft inside these limits,
// and validateDraft() checks the draft afterwards. Bump RULES_VERSION whenever a rule changes.
import type { Profile } from "../schema";

export const RULES_VERSION = "2.1";

export type Undertone = "warm" | "cool" | "neutral";
export type Confidence = "low" | "medium" | "good";

type Hint = NonNullable<Profile["photoHint"]>;

const WARM_COLOURS = ["olive", "terracotta", "mustard", "rust", "camel", "cream", "brown", "maroon", "teal", "beige", "orange", "navy"];
const COOL_COLOURS = ["navy", "charcoal", "emerald", "royal-blue", "burgundy", "lavender", "grey", "white", "purple", "teal", "pink", "blue"];
const NEUTRAL_COLOURS = ["navy", "grey", "white", "beige", "olive", "maroon", "teal", "black", "brown", "blue", "green"];
const NEON_AND_CLASHING = ["neon-yellow", "neon-green", "hot-pink"];

const PALETTES: Record<Undertone, { wear: string[]; avoid: string[] }> = {
  // Warm skin: skip icy and blue-based shades. Cool skin: skip earthy yellow-based shades.
  warm: { wear: WARM_COLOURS, avoid: ["lavender", "icy-blue", "silver-grey", "hot-pink", "royal-blue", "purple", ...NEON_AND_CLASHING] },
  cool: { wear: COOL_COLOURS, avoid: ["mustard", "orange", "rust", "camel", "terracotta", "yellow", ...NEON_AND_CLASHING] },
  neutral: { wear: NEUTRAL_COLOURS, avoid: NEON_AND_CLASHING },
};

export const BUDGET_MAX: Record<Profile["budgetBand"], number> = {
  "under-1500": 1500, "1500-3000": 3000, "3000-6000": 6000, "6000-plus": Number.POSITIVE_INFINITY,
};

export function decideUndertone(p: Profile): { undertone: Undertone; confidence: Confidence; reasons: string[] } {
  const score = { warm: 0, cool: 0, neutral: 0 };
  const reasons: string[] = [];
  const u = p.undertone;
  if (u.veins === "green") { score.warm += 2; reasons.push("green wrist veins"); }
  if (u.veins === "blue") { score.cool += 2; reasons.push("blue wrist veins"); }
  if (u.veins === "mixed") score.neutral += 2;
  if (u.jewellery === "gold") { score.warm += 1; reasons.push("gold suits you"); }
  if (u.jewellery === "silver") { score.cool += 1; reasons.push("silver suits you"); }
  if (u.jewellery === "both") score.neutral += 1;
  if (u.sun === "tans-easily") score.warm += 1;
  if (u.sun === "burns") score.cool += 1;
  if (u.sun === "burns-then-tans") score.neutral += 1;
  // A confirmed photo hint counts, but less than the person's own answers add up to.
  const h: Hint | null | undefined = p.photoHint;
  if (h) { score[h.undertoneHint as Undertone] += 1.5; reasons.push("a confirmed photo hint"); }

  const sorted = (Object.entries(score) as [Undertone, number][]).sort((a, b) => b[1] - a[1]);
  const [top, runner] = [sorted[0], sorted[1]];
  const gap = top[1] - runner[1];
  if (top[1] === 0 || gap === 0) return { undertone: "neutral", confidence: "low", reasons };
  return { undertone: top[0], confidence: gap >= 3 ? "good" : gap >= 2 ? "medium" : "low", reasons };
}

const SIZE_STEPS = [
  { max: 91, label: "S" }, { max: 99, label: "M" }, { max: 107, label: "L" }, { max: 115, label: "XL" }, { max: 125, label: "XXL" },
];

export function startingSize(chestOrBust: number | null): { size: string | null; note: string } {
  if (chestOrBust == null) return { size: null, note: "No chest/bust given, so no starting size." };
  const step = SIZE_STEPS.find((s) => chestOrBust <= s.max);
  return { size: step?.label ?? "XXXL", note: "A starting point only. Always check the brand’s own size chart." };
}

export type Limits = {
  rulesVersion: string;
  undertone: Undertone;
  confidence: Confidence;
  wearColours: string[];
  avoidColours: string[];
  /** colours the undertone rules rule out, before the customer's own dislikes are added */
  ruleAvoid: string[];
  /** the whole palette for this undertone, before the customer's dislikes are removed */
  paletteWear: string[];
  maxPricePerPiece: number;
  fit: { preferred: Profile["fitPreference"]; notes: string[] };
  size: ReturnType<typeof startingSize>;
  categories: Profile["categories"];
};

// Body-proportion notes. Each rule needs the measurements it names; with fewer measurements there are fewer notes, never guesses.
// Thresholds: 5% apart counts as a real difference; waist 25% or more below bust and hips counts as defined.
export function bodyNotes(p: Profile): string[] {
  const m = p.measurements, notes: string[] = [];
  const sh = m.shoulder.value, ch = m.chest_or_bust.value, wa = m.waist.value, hi = m.hips.value;
  const ht = m.height.value, inseam = m.inseam.value;
  const womens = p.presentation === "womenswear";
  if (ch != null && wa != null) {
    const waistRatio = wa / ch;
    if (hi != null && womens) {
      const hipRatio = hi / ch;
      if (waistRatio <= 0.78 && hipRatio >= 0.95 && hipRatio <= 1.05) notes.push("Balanced bust and hips with a defined waist: fitted waists, wrap and belted styles follow your shape.");
      else if (hipRatio > 1.05) notes.push("Hips fuller than bust: add interest on top (boat or square necks, light prints, structured shoulders) and keep bottoms in solid, flowing fabric.");
      else if (hipRatio < 0.95) notes.push("Bust fuller than hips: simple tops and necklines, with volume or pattern on the bottom half to balance.");
      else notes.push("Straighter shape: layering, belts and peplum or ruched details create a waist; avoid boxy cuts that hide it completely.");
    } else {
      if (waistRatio >= 1) notes.push("Waist as wide as the chest or wider: darker solids, structured fabrics and a straight hem worn untucked are the most flattering; avoid clingy knits.");
      else if (ch - wa >= 25) notes.push("Defined waist: tapered or tucked styles keep that shape.");
      else if (ch - wa <= 8) notes.push("Straighter build: structured layers and relaxed cuts both work.");
    }
  }
  if (sh != null && ch != null && !womens && ch / sh >= 3.1) notes.push("Narrower shoulders for your chest: structured shoulders, a crisp collar and layering add width at the top.");
  if (ht != null && inseam != null) {
    const legRatio = inseam / ht;
    if (legRatio < 0.43) notes.push("Shorter legs relative to height: high-rise bottoms and cropped lengths help.");
    else if (legRatio > 0.48) notes.push("Longer legs relative to height: straight and wide-leg bottoms work well.");
  }
  if (ht != null && ht < 160) notes.push("Under 160 cm: keep outfits close in tone head to toe and hems clean; avoid very long jackets and cuffed volume at the ankle.");
  if (ht != null && ht >= 185) notes.push("Tall frame: longer jackets, layering and breaks in colour at the waist suit you.");
  if (p.fitPreference === "oversized") notes.push("Oversized on top: keep bottoms more fitted to balance.");
  return notes;
}

export function buildLimits(p: Profile): Limits {
  const { undertone, confidence } = decideUndertone(p);
  const palette = PALETTES[undertone];
  const dislikes = new Set(p.dislikedColours.map((c) => c.toLowerCase()));
  const avoidColours = Array.from(new Set([...palette.avoid, ...dislikes]));
  const wearColours = palette.wear.filter((c) => !dislikes.has(c));

  const notes = bodyNotes(p);

  return {
    rulesVersion: RULES_VERSION, undertone, confidence, wearColours, avoidColours,
    ruleAvoid: palette.avoid.filter((c) => !c.startsWith("neon")), paletteWear: palette.wear,
    maxPricePerPiece: BUDGET_MAX[p.budgetBand],
    fit: { preferred: p.fitPreference, notes },
    size: startingSize(p.measurements.chest_or_bust.value),
    categories: p.categories,
  };
}

export type DraftItem = { name: string; colour: string; category: string; pricePerPiece: number; fit?: string; occasion?: string };

// Colours to keep out of wedding-guest outfits: red is the bride's colour, white and black are avoided at religious events.
export const WEDDING_AVOID = ["red", "white", "black"];
const INFORMAL_FOR_WORK = /\b(shorts|joggers?|track ?pants?|hoodie|sweatshirt|tank|sleeveless|ripped|distressed|flip[- ]?flops?|slides)\b/i;
export type Violation = { index: number; item: string; rule: string; detail: string };

// Checks the AI's draft against the limits. Anything returned here must be removed or replaced
// before the report reaches the customer.
export function validateDraft(items: DraftItem[], limits: Limits): Violation[] {
  const out: Violation[] = [];
  const avoid = new Set(limits.avoidColours.map((c) => c.toLowerCase()));
  const seen = new Set<string>();
  items.forEach((it, index) => {
    const key = `${it.name.toLowerCase()}|${it.colour.toLowerCase()}`;
    if (seen.has(key)) out.push({ index, item: it.name, rule: "duplicate", detail: "same item and colour listed twice" });
    seen.add(key);
    if (avoid.has(it.colour.toLowerCase()))
      out.push({ index, item: it.name, rule: "colour-avoid", detail: `${it.colour} is on the avoid list` });
    if (!limits.categories.includes(it.category as Limits["categories"][number]))
      out.push({ index, item: it.name, rule: "category-not-requested", detail: `${it.category} was not requested` });
    if (it.pricePerPiece > limits.maxPricePerPiece)
      out.push({ index, item: it.name, rule: "over-budget", detail: `₹${it.pricePerPiece} is over ₹${limits.maxPricePerPiece}` });
    if (it.occasion && /wedding/i.test(it.occasion) && WEDDING_AVOID.includes(it.colour.toLowerCase()))
      out.push({ index, item: it.name, rule: "wedding-colour", detail: `${it.colour} is avoided for wedding guests` });
    if (it.fit && limits.fit.preferred === "slim" && it.fit === "oversized")
      out.push({ index, item: it.name, rule: "fit-mismatch", detail: "oversized item for a slim-fit customer" });
    if (it.fit && limits.fit.preferred === "relaxed" && ["skinny", "slim"].includes(it.fit))
      out.push({ index, item: it.name, rule: "fit-mismatch", detail: `${it.fit} item for a relaxed-fit customer` });
    if (it.fit && limits.fit.preferred === "regular" && ["skinny", "oversized"].includes(it.fit))
      out.push({ index, item: it.name, rule: "fit-mismatch", detail: `${it.fit} item for a regular-fit customer` });
    if (it.occasion && /office|interview|formal/i.test(it.occasion) && INFORMAL_FOR_WORK.test(it.name))
      out.push({ index, item: it.name, rule: "occasion-mismatch", detail: `${it.name} is too casual for ${it.occasion}` });
    if (it.fit && limits.fit.preferred === "oversized" && it.fit === "skinny")
      out.push({ index, item: it.name, rule: "fit-mismatch", detail: "skinny item for an oversized-fit customer" });
  });
  return out;
}
