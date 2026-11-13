import { describe, expect, it } from "vitest";
import { buildLimits, validateDraft } from "../lib/rules/engine";
import { buildGuide } from "../lib/rules/guide";
import { SOURCES } from "../lib/rules/sources";
import { assembleReport } from "../lib/report/build";
import { profileSchema } from "../lib/schema";
import { validIntake } from "./fixtures";

const base = () => profileSchema.parse(validIntake().profile);
const woman = () => ({
  ...base(), presentation: "womenswear" as const, categories: ["ethnic-women", "western-women", "footwear"] as ("ethnic-women" | "western-women" | "footwear")[],
  occasions: ["wedding-guest", "festival", "office"] as ("wedding-guest" | "festival" | "office")[],
  measurements: { ...base().measurements, chest_or_bust: { value: 88, unsure: false }, hips: { value: 104, unsure: false } },
});

describe("rules v2 guide", () => {
  it("every rule names a real source or is a house rule", () => {
    for (const p of [base(), woman(), { ...base(), categories: ["ethnic-men" as const], occasions: ["festival" as const, "wedding-guest" as const] }]) {
      const g = buildGuide(p, buildLimits(p));
      const rules = [
        ...g.patterns.wear, ...g.patterns.mixing, ...g.patterns.avoid, ...g.sizeSafety, ...g.finishing,
        ...g.fits.flatMap((f) => [...f.checks, ...f.mistakes]), ...g.occasions.flatMap((o) => [...o.dos, ...o.avoid]),
      ];
      expect(rules.length).toBeGreaterThan(10);
      for (const r of rules) {
        if (r.kind === "house") expect(r.src).toEqual([]);
        else { expect(r.src.length).toBeGreaterThan(0); r.src.forEach((s) => expect(SOURCES[s]).toBeTruthy()); }
      }
      expect(g.sources.length).toBeGreaterThan(2);
    }
  });
  it("gives sizes only from entered measurements", () => {
    const g = buildGuide(base(), buildLimits(base()));
    expect(g.sizes.find((s) => s.garment === "Shirts and tees")?.size).toBe("M");
    const trousers = g.sizes.find((s) => s.garment === "Trousers and chinos");
    expect(trousers?.size).toBeNull(); // waist was "not sure"
    expect(trousers?.basis).toMatch(/Not enough information/);
  });
  it("sizes trousers from the waist and goes up between sizes", () => {
    const p = { ...base(), measurements: { ...base().measurements, waist: { value: 81, unsure: false } } };
    expect(buildGuide(p, buildLimits(p)).sizes.find((s) => s.garment.startsWith("Trousers"))?.size).toBe("32 in");
    const q = { ...base(), measurements: { ...base().measurements, waist: { value: 84, unsure: false } } };
    expect(buildGuide(q, buildLimits(q)).sizes.find((s) => s.garment.startsWith("Trousers"))?.size).toBe("34 in");
  });
  it("marks women's sizes as drafts and flags big top/bottom gaps", () => {
    const p = woman();
    const g = buildGuide(p, buildLimits(p));
    const tops = g.sizes.find((s) => s.garment.startsWith("Tops"));
    expect(tops).toMatchObject({ size: "M", draft: true });
    expect(g.sizes.find((s) => s.garment === "Bottoms and trousers")?.size).toBe("L");
    expect(g.sizes.find((s) => s.garment === "Dresses")?.size).toBe("L");
  });
  it("adds wedding and festival add-ons only when asked, with palette colours", () => {
    const g = buildGuide(woman(), buildLimits(woman()));
    expect(g.occasions.map((o) => o.id).sort()).toEqual(["festival", "wedding-guest"]);
    const wedding = g.occasions.find((o) => o.id === "wedding-guest")!;
    expect(wedding.avoid.map((r) => r.text).join(" ")).toMatch(/red/i);
    expect(buildGuide(base(), buildLimits(base())).occasions).toEqual([]);
  });
  it("only shows fit guidance for the categories chosen", () => {
    const g = buildGuide(base(), buildLimits(base()));
    expect(g.fits.map((f) => f.garment).join()).toMatch(/Shirts/);
    expect(g.fits.map((f) => f.garment).join()).not.toMatch(/blouse|Kurtas/i);
  });
  it("keeps red, white and black out of wedding-guest outfits", () => {
    const p = woman(); const l = buildLimits(p);
    const v = validateDraft([{ name: "White kurta", colour: "white", category: "ethnic-women", pricePerPiece: 900, occasion: "Wedding guest" }], l);
    expect(v.map((x) => x.rule)).toContain("wedding-colour");
    expect(validateDraft([{ name: "White kurta", colour: "white", category: "ethnic-women", pricePerPiece: 900, occasion: "Office" }], l).map((x) => x.rule)).not.toContain("wedding-colour");
  });
  it("builds a full v2 report with shopping priorities and no card extras", () => {
    const r = assembleReport(base(), null, "report", { testMode: true });
    expect(r).toMatchObject({ version: 2, testMode: true, rulesVersion: "2.1" });
    expect(r.guide && r.shopping && r.profile).toBeTruthy();
    expect(r.shopping!.buyFirst.length).toBeGreaterThan(0);
    expect(r.colours.roles!.neutral.length).toBeGreaterThan(0);
    const card = assembleReport(base(), null, "card");
    expect(card.guide).toBeUndefined();
  });
});

describe("footwear and accessories follow who the report is for", () => {
  it("never suggests heels to menswear or lace-ups to womenswear", () => {
    const names = (pres: "menswear" | "womenswear") => {
      const p = { ...base(), presentation: pres, categories: ["footwear"] as never, occasions: ["wedding-guest", "parties", "festival", "formal"] as never, stylePrefs: ["ethnic", "classic", "trendy"] as never };
      return buildGuide(p, buildLimits(p)).clothing.flatMap((c) => c.picks.map((x) => x.name)).join("|");
    };
    expect(names("menswear")).not.toMatch(/heels|Flat sandals/);
    expect(names("womenswear")).not.toMatch(/lace-ups|chappals/);
  });
});
