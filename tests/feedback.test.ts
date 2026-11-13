import { describe, expect, it } from "vitest";
import { memoryClient } from "../lib/dev-memory-db";
import { feedbackSchema, feedbackSummary, saveFeedback } from "../lib/feedback";

const tok = "a".repeat(30);
describe("feedback", () => {
  it("accepts tags and a rating only, once per customer, and summarises them", async () => {
    const db = memoryClient("anonymous");
    const { data: p } = await db.from("profiles").insert({ age_range: "25-30" }).select("id").single();
    await db.from("reports").insert({ profile_id: p.id, status: "ready", access_token: tok });
    const f = { token: tok, rating: 4, wouldPay: true, tags: ["colours-right", "easy-to-follow"] };
    expect(await saveFeedback(db, f)).toBe("saved");
    expect(await saveFeedback(db, f)).toBe("exists");
    expect(await saveFeedback(db, { ...f, token: "b".repeat(30) })).toBe("not-found");
    const s = await feedbackSummary(db);
    expect(s.count).toBe(1); expect(s.avgRating).toBe(4); expect(s.wouldPayShare).toBe(1);
    expect(s.topTags[0].tag).toBe("Colours felt right");
  });
  it("keeps the two notes, and rejects unknown tags and out-of-range ratings", () => {
    expect(feedbackSchema.safeParse({ token: tok, rating: 6, wouldPay: true, tags: [] }).success).toBe(false);
    expect(feedbackSchema.safeParse({ token: tok, rating: 3, wouldPay: true, tags: ["call me on 98765"] }).success).toBe(false);
    const ok = feedbackSchema.safeParse({ token: tok, rating: 3, tags: [], notes: "hi", feltWrong: "  colours too pale ", liked: "" });
    expect(ok.success).toBe(true); // unknown keys are dropped, never stored
    expect(ok.success && (ok.data as Record<string, unknown>).notes).toBeUndefined();
    expect(ok.success && ok.data.feltWrong).toBe("colours too pale");
    expect(feedbackSchema.safeParse({ token: tok, rating: 3, feltWrong: "x".repeat(601) }).success).toBe(false);
  });
});
