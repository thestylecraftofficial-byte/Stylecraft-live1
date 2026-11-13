import { z } from "zod";
import { CATEGORIES } from "../schema";
import type { Guide } from "../rules/guide";

export const draftItem = z.object({
  name: z.string().min(2).max(80),
  colour: z.string().min(2).max(30),
  category: z.enum(CATEGORIES),
  pricePerPiece: z.number().min(100).max(200000),
  fit: z.string().max(20).optional(),
});

// What the AI is asked to return. Colours are not part of it: the rule engine owns the palette.
export const draftSchema = z.object({
  styleDna: z.object({
    name: z.string().min(3).max(60),
    summary: z.string().min(10).max(300),
    tips: z.array(z.string().min(5).max(160)).max(4).optional(),
  }),
  outfits: z.array(z.object({
    name: z.string().min(3).max(60),
    occasion: z.string().min(3).max(30),
    why: z.string().min(5).max(260).optional(),
    swap: z.string().min(5).max(200).optional(),
    items: z.array(draftItem).min(2).max(5),
  })).min(3).max(8),
  dontBuy: z.array(z.object({ item: z.string().min(3).max(80), reason: z.string().min(5).max(200) })).min(3).max(8),
  plan: z.array(z.object({ week: z.number().int().min(1).max(4), focus: z.string().min(3).max(60), action: z.string().min(5).max(240) })).min(4).max(8),
});
export type Draft = z.infer<typeof draftSchema>;

export type Swatch = { name: string; hex: string; why?: string };
export type ShopLine = { name: string; colour: string; category: string; price: number; outfits: number };
export type Shopping = {
  buyFirst: ShopLine[]; optional: ShopLine[]; totalFirst: number; totalAll: number;
  split: { category: string; amount: number; share: number }[]; note: string;
};
export type ProfileSummary = {
  ageRange: string; presentation: string; occasions: string[]; stylePrefs: string[]; fit: string; budgetBand: string;
  measurements: { label: string; value: string }[]; missing: string[]; photoUsed: boolean;
};

export type Report = {
  version: 1 | 2;
  tier: "card" | "report";
  rulesVersion: string;
  source: "ai" | "ai+template" | "template";
  generatedAt: string;
  /** True for reports made through a pilot test link. Shows the test notice. */
  testMode?: boolean;
  styleDna: Draft["styleDna"] & { formality?: string; signature?: Swatch[] };
  undertone: { value: string; confidence: string; reasons: string[]; note?: string };
  colours: {
    wear: Swatch[]; avoid: Swatch[];
    roles?: { primary: Swatch[]; secondary: Swatch[]; accent: Swatch[]; neutral: Swatch[] };
    combos?: { name: string; colours: Swatch[] }[];
  };
  size: { size: string | null; note: string };
  fitNotes: string[];
  outfits: Draft["outfits"];
  dontBuy: Draft["dontBuy"];
  plan: Draft["plan"];
  review: { needsReview: boolean; itemsChanged: number; itemsTotal: number; changes: { item: string; rule: string; detail: string }[]; stylistReviewed?: boolean };
  guide?: Guide;
  shopping?: Shopping;
  profile?: ProfileSummary;
};
