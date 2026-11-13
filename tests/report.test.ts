import { describe, expect, it } from "vitest";
import { buildLimits, validateDraft } from "../lib/rules/engine";
import { buildPrompt, generateDraft, generateDraftEx } from "../lib/ai/gemini";
import { buildReport } from "../lib/report/build";
import { templateDraft } from "../lib/report/template";
import { profileSchema } from "../lib/schema";
import { validIntake } from "./fixtures";
import type { Draft } from "../lib/report/types";

const profile = () => profileSchema.parse(validIntake().profile);
const goodDraft = (p = profile()): Draft => templateDraft(p, buildLimits(p));

describe("template fallback", () => {
  it("always passes its own rules", () => {
    for (const budget of ["under-1500", "1500-3000", "3000-6000", "6000-plus"] as const) {
      for (const cats of [["western-men"], ["ethnic-women", "footwear"], ["western-women", "accessories", "ethnic-men"]] as const) {
        const p = { ...profile(), budgetBand: budget, categories: [...cats] };
        const d = templateDraft(p, buildLimits(p));
        expect(d.outfits.length).toBeGreaterThanOrEqual(3);
        expect(validateDraft(d.outfits.flatMap((o) => o.items), buildLimits(p))).toEqual([]);
      }
    }
  });
});

describe("buildReport", () => {
  it("uses the template when the AI fails", async () => {
    const r = await buildReport(profile(), async () => null);
    expect(r.source).toBe("template");
    expect(r.review.needsReview).toBe(false);
  });
  it("keeps a clean AI draft as it is", async () => {
    const r = await buildReport(profile(), async () => goodDraft());
    expect(r.source).toBe("ai");
    expect(r.review.itemsChanged).toBe(0);
  });
  it("removes items that break the rules and flags heavy changes for review", async () => {
    const d = goodDraft();
    d.outfits = d.outfits.map((o) => ({ ...o, items: [...o.items.slice(0, 2), { name: "Neon overshirt", colour: "neon-yellow", category: "western-men" as const, pricePerPiece: 1500 }] }));
    const r = await buildReport(profile(), async () => d);
    expect(r.outfits.flatMap((o) => o.items).some((i) => i.colour === "neon-yellow")).toBe(false);
    expect(r.review.itemsChanged).toBeGreaterThan(0);
    expect(r.review.needsReview).toBe(true);
    expect(r.review.changes[0].rule).toBe("colour-avoid");
    const p = profile();
    expect(validateDraft(r.outfits.flatMap((o) => o.items), buildLimits(p))).toEqual([]);
  });
  it("tops up from the template when too few outfits survive", async () => {
    const d = goodDraft();
    d.outfits = d.outfits.map((o) => ({ ...o, items: o.items.map((i) => ({ ...i, pricePerPiece: 99999 })) }));
    const r = await buildReport(profile(), async () => d);
    expect(r.source).toBe("ai+template");
    expect(r.outfits.length).toBeGreaterThanOrEqual(3);
  });
});

describe("gemini call", () => {
  it("never sends name, phone, email or raw measurements", () => {
    const p = profile();
    const { system, user } = buildPrompt(p, buildLimits(p));
    const all = system + user;
    for (const secret of ["Test Person", "9876543210", "t@example.com", "172", "chest_or_bust"]) expect(all).not.toContain(secret);
  });
  it("returns null on bad JSON, wrong shape or HTTP errors, and the draft on success", async () => {
    const p = profile(); const l = buildLimits(p);
    const reply = (text: string) => (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 })) as unknown as typeof fetch;
    expect(await generateDraft(p, l, { apiKey: "k", fetchImpl: reply("not json") })).toBeNull();
    expect(await generateDraft(p, l, { apiKey: "k", fetchImpl: reply("{}") })).toBeNull();
    expect(await generateDraft(p, l, { apiKey: "k", fetchImpl: (async () => new Response("no", { status: 500 })) as unknown as typeof fetch })).toBeNull();
    expect(await generateDraft(p, l, { apiKey: "", fetchImpl: reply("{}") })).toBeNull();
    expect(await generateDraft(p, l, { apiKey: "k", fetchImpl: reply(JSON.stringify(goodDraft(p))) })).not.toBeNull();
  });
  it("moves to the lighter model when the main one is rate-limited", async () => {
    const p = profile(); const l = buildLimits(p); const used: string[] = [];
    const f = (async (url: string) => {
      used.push(String(url).match(/models\/([^:]+):/)![1]);
      return used.length === 1 ? new Response("busy", { status: 429 })
        : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(goodDraft(p)) }] } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await generateDraftEx(p, l, { apiKey: "k", fetchImpl: f });
    expect(r.draft).not.toBeNull();
    expect(used).toEqual(["gemini-3.8-flash", "gemini-3.5-flash-lite"]);
  });
});
