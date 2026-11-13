import { describe, expect, it } from "vitest";
import { buildLimits, decideUndertone, startingSize, validateDraft } from "../lib/rules/engine";
import { classifyFaceShape, classifySkin, faceShapeFromRatios } from "../lib/photo/classify";
import { profileSchema } from "../lib/schema";
import { validIntake } from "./fixtures";

const profile = () => profileSchema.parse(validIntake().profile);

describe("rule engine v1", () => {
  it("reads a warm undertone from green veins, gold and easy tanning", () => {
    expect(decideUndertone(profile()).undertone).toBe("warm");
  });
  it("falls back to neutral with low confidence when answers conflict", () => {
    const p = profile();
    p.undertone = { ...p.undertone, veins: "blue", jewellery: "gold", sun: "burns-then-tans" };
    const r = decideUndertone(p);
    expect(r.confidence).toBe("low");
  });
  it("never recommends a colour the customer dislikes", () => {
    const l = buildLimits({ ...profile(), dislikedColours: ["olive", "maroon"] });
    expect(l.wearColours).not.toContain("olive");
    expect(l.avoidColours).toContain("maroon");
  });
  it("gives no size when chest is missing, and a letter size otherwise", () => {
    expect(startingSize(null).size).toBeNull();
    expect(startingSize(98).size).toBe("M");
  });
  it("flags draft items outside the limits", () => {
    const l = buildLimits(profile());
    const v = validateDraft(
      [
        { name: "Neon overshirt", colour: "neon-yellow", category: "western-men", pricePerPiece: 1800 },
        { name: "Saree", colour: "maroon", category: "ethnic-women", pricePerPiece: 2000 },
        { name: "Blazer", colour: "navy", category: "western-men", pricePerPiece: 9000 },
        { name: "Olive shirt", colour: "olive", category: "western-men", pricePerPiece: 1500 },
      ],
      l
    );
    expect(v.map((x) => x.rule).sort()).toEqual(["category-not-requested", "colour-avoid", "over-budget"]);
  });
  it("a photo hint can tip an otherwise tied result but never overrides clear answers", () => {
    const p = profile();
    p.undertone = { veins: "mixed", sun: "burns-then-tans", jewellery: "both", hair: "black", eyes: "brown" };
    p.photoHint = { skinDepth: "medium", undertoneHint: "warm", faceShape: "oval" };
    expect(decideUndertone(p).undertone).toBe("neutral");
  });
});

describe("photo classifiers", () => {
  it("classifies skin depth and undertone from average colour", () => {
    expect(classifySkin([235, 200, 180]).depth).toBe("light");
    expect(classifySkin([90, 60, 45]).depth).toBe("deep");
    expect(classifySkin([198, 150, 100]).undertone).toBe("warm");
  });
  it("classifies face shape from ratios", () => {
    expect(faceShapeFromRatios(1.5, 0.8, 0.85)).toBe("oblong");
    expect(faceShapeFromRatios(1.35, 0.7, 1.0)).toBe("heart");
    expect(faceShapeFromRatios(1.2, 0.9, 0.9)).toBe("square");
    expect(faceShapeFromRatios(1.28, 0.8, 0.85)).toBe("round");
    expect(faceShapeFromRatios(1.38, 0.8, 0.85)).toBe("oval");
  });
  it("reads landmark points", () => {
    const pts = Array.from({ length: 478 }, () => ({ x: 0, y: 0 }));
    Object.assign(pts[10], { x: 100, y: 0 }); Object.assign(pts[152], { x: 100, y: 138 });
    Object.assign(pts[234], { x: 50, y: 70 }); Object.assign(pts[454], { x: 150, y: 70 });
    Object.assign(pts[172], { x: 60, y: 120 }); Object.assign(pts[397], { x: 140, y: 120 });
    Object.assign(pts[54], { x: 55, y: 10 }); Object.assign(pts[284], { x: 145, y: 10 });
    expect(classifyFaceShape(pts)).toBe("oval");
  });
});

describe("rule engine 2.1: palettes, body notes, validation", () => {
  it("no palette both recommends and avoids the same colour", () => {
    for (const [veins, jewellery] of [["green", "gold"], ["blue", "silver"], ["mixed", "both"]] as const) {
      const p = profile();
      p.undertone = { ...p.undertone, veins, jewellery, sun: "not-sure" };
      p.dislikedColours = [];
      const l = buildLimits(p);
      expect(l.wearColours.filter((c) => l.avoidColours.includes(c))).toEqual([]);
    }
  });
  it("every avoid colour has a swatch so the report can draw it", async () => {
    const { hexFor } = await import("../lib/report/colours");
    for (const u of ["green", "blue", "mixed"] as const) {
      const p = profile(); p.undertone = { ...p.undertone, veins: u, jewellery: "not-sure", sun: "not-sure" };
      for (const c of buildLimits(p).ruleAvoid) expect(hexFor(c)).not.toBe("#B8AD9D");
    }
  });
  it("reads a woman's proportions from bust, waist and hips", async () => {
    const { bodyNotes } = await import("../lib/rules/engine");
    const p = profile();
    p.presentation = "womenswear";
    p.measurements = { ...p.measurements, chest_or_bust: { value: 90, unsure: false }, waist: { value: 68, unsure: false }, hips: { value: 98, unsure: false } };
    expect(bodyNotes(p).join(" ")).toMatch(/Hips fuller than bust/);
    p.measurements = { ...p.measurements, hips: { value: 91, unsure: false } };
    expect(bodyNotes(p).join(" ")).toMatch(/defined waist/i);
  });
  it("gives no proportion notes when the needed measurements are missing", async () => {
    const { bodyNotes } = await import("../lib/rules/engine");
    const p = profile();
    p.fitPreference = "regular";
    p.measurements = Object.fromEntries(Object.keys(p.measurements).map((k) => [k, { value: null, unsure: true }])) as typeof p.measurements;
    expect(bodyNotes(p)).toEqual([]);
  });
  it("flags casual items for work, fit clashes and repeats", () => {
    const p = profile(); p.fitPreference = "relaxed";
    const l = buildLimits(p);
    const v = validateDraft(
      [
        { name: "Track pants", colour: "navy", category: "western-men", pricePerPiece: 900, occasion: "office" },
        { name: "Skinny jeans", colour: "navy", category: "western-men", pricePerPiece: 900, fit: "skinny" },
        { name: "Oxford shirt", colour: "navy", category: "western-men", pricePerPiece: 900 },
        { name: "Oxford shirt", colour: "navy", category: "western-men", pricePerPiece: 900 },
      ], l);
    expect(v.map((x) => x.rule).sort()).toEqual(["duplicate", "fit-mismatch", "occasion-mismatch"]);
  });
});
