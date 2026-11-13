import { describe, expect, it } from "vitest";
import { memoryClient } from "../lib/dev-memory-db";

describe("in-memory dev database", () => {
  it("behaves like the real one for the shapes the app uses", async () => {
    const db = memoryClient("anonymous");
    const { data: p } = await db.from("profiles").insert({ age_range: "25-30" }).select("id").single();
    expect(p.id).toBeTruthy();
    expect((await db.from("reports").insert({ profile_id: p.id, status: "ready" })).error).toBeNull();
    expect((await db.from("reports").insert({ profile_id: p.id })).error.code).toBe("23505"); // one report per profile
    const claimed = await db.from("reports").update({ checks_used: 1 }).eq("profile_id", p.id).lt("checks_used", 1).select("profile_id");
    expect(claimed.data).toHaveLength(1);
    const again = await db.from("reports").update({ checks_used: 1 }).eq("profile_id", p.id).lt("checks_used", 1).select("profile_id");
    expect(again.data).toHaveLength(0); // the free check can only be claimed once
    expect((await db.from("reports").select("status").eq("profile_id", "nope").maybeSingle()).data).toBeNull();
  });
});
