import type { Profile } from "../schema";
import { buildLimits, decideUndertone, validateDraft, type DraftItem, type Limits } from "../rules/engine";
import { buildGuide } from "../rules/guide";
import { generateDraft } from "../ai/gemini";
import { hexFor, prettyColour } from "./colours";
import { colourRoles, swatch, avoidList } from "./palette";
import { buildShopping } from "./shopping";
import { templateDraft, templateOutfits } from "./template";
import type { Draft, ProfileSummary, Report } from "./types";

const MIN_OUTFITS = 3;
const REVIEW_SHARE = 0.3;

export type DraftFn = (p: Profile, limits: ReturnType<typeof buildLimits>) => Promise<Draft | null>;

// form -> rules set limits -> AI drafts -> rules check -> repaired report. Rules always have the last word.
export async function buildReport(p: Profile, draftFn: DraftFn = generateDraft, tier: "card" | "report" = "report", opts: BuildOpts = {}): Promise<Report> {
  const limits = buildLimits(p);
  // The ₹99 style card needs no AI: palette, fit basics and a style line come from the rules and template.
  const ai = tier === "card" ? null : await draftFn(p, limits);
  return assembleReport(p, ai, tier, opts);
}

export type BuildOpts = { testMode?: boolean };

const FORMAL = ["office", "formal", "interview", "wedding-guest"];
const formality = (occ: string[]) => {
  const n = occ.filter((o) => FORMAL.includes(o)).length;
  return n === 0 ? "Relaxed" : n * 2 >= occ.length ? "Polished" : "Smart-casual";
};
const MEAS_LABEL: Record<string, string> = { height: "Height", shoulder: "Shoulder", chest_or_bust: "Chest / bust", waist: "Waist", hips: "Hips", inseam: "Inseam" };

export function profileSummary(p: Profile): ProfileSummary {
  const entries = Object.entries(p.measurements) as [string, { value: number | null; unsure: boolean }][];
  return {
    ageRange: p.ageRange, presentation: p.presentation, occasions: p.occasions, stylePrefs: p.stylePrefs, fit: p.fitPreference, budgetBand: p.budgetBand,
    measurements: entries.filter(([, m]) => !m.unsure && m.value != null).map(([k, m]) => ({ label: MEAS_LABEL[k] ?? k, value: `${m.value} cm` })),
    missing: entries.filter(([, m]) => m.unsure || m.value == null).map(([k]) => MEAS_LABEL[k] ?? k),
    photoUsed: !!p.photoHint,
  };
}

// Turns an AI draft (or none) into the finished report: checks it against the rules and adds the rule-written guidance.
export function assembleReport(p: Profile, ai: Draft | null, tier: "card" | "report", opts: BuildOpts = {}): Report {
  const limits: Limits = buildLimits(p);
  const fallback = templateDraft(p, limits);

  let source: Report["source"] = "template";
  let draft: Draft = fallback;
  const changes: Report["review"]["changes"] = [];
  let itemsTotal = 0;
  let itemsChanged = 0;

  if (ai) {
    const flat: DraftItem[] = ai.outfits.flatMap((o) => o.items.map((it) => ({ ...it, occasion: o.occasion })));
    itemsTotal = flat.length;
    const violations = validateDraft(flat, limits);
    const bad = new Set(violations.map((v) => v.index));
    itemsChanged = bad.size;
    violations.forEach((v) => changes.push({ item: v.item, rule: v.rule, detail: v.detail }));

    let k = 0;
    const kept = ai.outfits
      .map((o) => ({ ...o, items: o.items.filter(() => !bad.has(k++)) }))
      .filter((o) => o.items.length >= 2);

    let outfits = kept;
    source = "ai";
    if (outfits.length < MIN_OUTFITS) {
      outfits = [...kept, ...templateOutfits(p, limits, MIN_OUTFITS - kept.length + 1)].slice(0, Math.max(MIN_OUTFITS, kept.length));
      source = "ai+template";
    }
    draft = { ...ai, outfits, styleDna: { ...ai.styleDna, tips: ai.styleDna.tips?.length ? ai.styleDna.tips : fallback.styleDna.tips } };
  }

  const u = decideUndertone(p);
  const note = u.confidence === "low"
    ? "The evidence was thin, so this is a safe middle palette, not a firm answer. Hold fabric under your chin in daylight to check."
    : u.confidence === "medium"
      ? "Your answers lean this way. Check the colours under your chin in daylight."
      : "Several of your answers agree. Still, check colours under your chin in daylight.";
  const { roles, combos } = colourRoles(p, limits);
  const share = itemsTotal ? itemsChanged / itemsTotal : 0;
  const full = tier !== "card";
  return {
    version: 2,
    tier,
    rulesVersion: limits.rulesVersion,
    source,
    generatedAt: new Date().toISOString(),
    testMode: opts.testMode,
    styleDna: { ...draft.styleDna, formality: formality(p.occasions), signature: limits.wearColours.slice(0, 3).map(swatch) },
    undertone: { value: limits.undertone, confidence: limits.confidence, reasons: u.reasons, note },
    colours: {
      wear: limits.wearColours.slice(0, 8).map((c) => ({ name: prettyColour(c), hex: hexFor(c) })),
      avoid: avoidList(p, limits),
      roles, combos,
    },
    size: limits.size,
    fitNotes: limits.fit.notes,
    outfits: full ? draft.outfits : [],
    dontBuy: full ? draft.dontBuy : [],
    plan: full ? draft.plan : [],
    review: { needsReview: share >= REVIEW_SHARE, itemsChanged, itemsTotal, changes, stylistReviewed: false },
    guide: full ? buildGuide(p, limits) : undefined,
    shopping: full ? buildShopping(draft.outfits) : undefined,
    profile: profileSummary(p),
  };
}
