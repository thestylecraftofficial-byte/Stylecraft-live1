// Deterministic fallback: used when the AI is down, returns bad JSON, or too little of its draft survives the rules.
import type { Profile } from "../schema";
import type { Limits } from "../rules/engine";
import type { Draft } from "./types";

type Piece = { name: string; category: Profile["categories"][number]; base: number; fit?: string };
const PIECES: Record<Profile["categories"][number], Piece[]> = {
  "western-men": [{ name: "Shirt", category: "western-men", base: 0.6 }, { name: "Chinos", category: "western-men", base: 0.7 }, { name: "Overshirt", category: "western-men", base: 0.9 }],
  "western-women": [{ name: "Top", category: "western-women", base: 0.5 }, { name: "Straight trousers", category: "western-women", base: 0.7 }, { name: "Blazer", category: "western-women", base: 0.95 }],
  "ethnic-men": [{ name: "Kurta", category: "ethnic-men", base: 0.7 }, { name: "Pyjama", category: "ethnic-men", base: 0.4 }],
  "ethnic-women": [{ name: "Kurta set", category: "ethnic-women", base: 0.9 }, { name: "Dupatta", category: "ethnic-women", base: 0.4 }],
  footwear: [{ name: "Leather loafers", category: "footwear", base: 0.95 }, { name: "Clean sneakers", category: "footwear", base: 0.8 }],
  accessories: [{ name: "Watch", category: "accessories", base: 0.9 }, { name: "Belt", category: "accessories", base: 0.4 }],
};
const OCCASION_LABEL = (o: string) => o.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

export function templateOutfits(p: Profile, limits: Limits, count: number): Draft["outfits"] {
  const cap = Number.isFinite(limits.maxPricePerPiece) ? limits.maxPricePerPiece : 6000;
  const colours = limits.wearColours.length ? limits.wearColours : ["navy"];
  const occasions = p.occasions.length ? p.occasions : ["everyday"];
  const cats = limits.categories;
  const outfits: Draft["outfits"] = [];
  for (let i = 0; i < count; i++) {
    const occasion = occasions[i % occasions.length];
    const items: Draft["outfits"][number]["items"] = [];
    for (let j = 0; j < Math.min(3, cats.length * 2); j++) {
      const cat = cats[(i + j) % cats.length];
      const piece = PIECES[cat][(i + j) % PIECES[cat].length];
      const colour = colours[(i * 2 + j) % colours.length];
      if (items.some((x) => x.name === `${OCCASION_LABEL(colour)} ${piece.name.toLowerCase()}`)) continue;
      items.push({
        name: `${OCCASION_LABEL(colour)} ${piece.name.toLowerCase()}`, colour, category: cat,
        pricePerPiece: Math.max(100, Math.round((cap * piece.base) / 50) * 50),
        fit: limits.fit.preferred === "not-sure" ? "regular" : limits.fit.preferred,
      });
    }
    if (items.length >= 2) {
      const priciest = [...items].sort((a, b) => b.pricePerPiece - a.pricePerPiece)[0];
      outfits.push({
        name: `${OCCASION_LABEL(occasion)} look ${i + 1}`, occasion: OCCASION_LABEL(occasion), items,
        why: `Built for your ${occasion.replace(/-/g, " ")} plans, in your ${limits.undertone} palette and a ${limits.fit.preferred === "not-sure" ? "regular" : limits.fit.preferred} fit.`,
        swap: `Lower-cost swap: replace the ${priciest.name.toLowerCase()} with a plainer one in the same colour from a budget store.`,
      });
    }
  }
  return outfits;
}

export function templateDraft(p: Profile, limits: Limits): Draft {
  const style = p.stylePrefs[0] ?? "classic";
  const avoid = limits.avoidColours.slice(0, 3).map((c) => OCCASION_LABEL(c));
  return {
    styleDna: { name: `The ${OCCASION_LABEL(style)} Dresser`, summary: `Clothes built around ${style.replace(/-/g, " ")} ideas, your ${limits.undertone} colours and a ${p.fitPreference} fit.`,
      tips: ["Keep to two or three palette colours in any one outfit.", "Check the shoulder fit before anything else.", "Buy pieces you can repeat across outfits before one-off pieces."] },
    outfits: templateOutfits(p, limits, 4),
    dontBuy: [
      ...avoid.map((c) => ({ item: `${c} clothing near the face`, reason: "It does not suit your colouring as well as your recommended shades." })),
      { item: "Clothes that are only a good deal", reason: "A discount is not a reason to buy something that does not fit your plan." },
    ].slice(0, 4),
    plan: [
      { week: 1, focus: "Clear out", action: "Remove pieces in your avoid colours or that do not fit well." },
      { week: 2, focus: "Core pieces", action: "Buy two core pieces in your main colours." },
      { week: 3, focus: "Build outfits", action: "Try three outfits from this report and note what feels right." },
      { week: 4, focus: "Fill gaps", action: "Add one footwear or accessory piece that ties outfits together." },
    ],
  };
}
