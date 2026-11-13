import { beforeEach, describe, expect, it } from "vitest";
import { memoryClient } from "../lib/dev-memory-db";
import { checkTestLink, consumeTestLink, createTestLink, labelFor, recordUse, retryFor } from "../lib/testmode";
import { createPending, MAX_TRIES, prepareReport } from "../lib/report/load";
import { saveIntake } from "../lib/intake";
import { intakeSchema } from "../lib/schema";
import { listPilot, toCsv } from "../lib/pilot";
import { validIntake } from "./fixtures";
import type { Draft } from "../lib/report/types";

const identity = () => memoryClient("identity");
const anonymous = () => memoryClient("anonymous");
beforeEach(() => { (globalThis as { __memdb?: unknown }).__memdb = undefined; });

describe("test links", () => {
  it("creates a 24-hour link with a name and note, and lets it be checked", async () => {
    const now = new Date("2026-11-10T10:00:00Z");
    const l = await createTestLink(identity(), { label: " Rahul ", note: "college friend" }, now);
    expect(l.label).toBe("Rahul");
    expect(l.code).toMatch(/^[a-z2-9]{10}$/);
    expect(new Date(l.expires_at).getTime() - now.getTime()).toBe(24 * 3_600_000);
    const st = await checkTestLink(identity(), l.code, now);
    expect(st.ok && st.remaining).toBe(2);
  });
  it("defaults the name, rejects bad or unknown codes and expires after 24 hours", async () => {
    const now = new Date("2026-11-10T10:00:00Z");
    const l = await createTestLink(identity(), {}, now);
    expect(l.label).toBe("Friend");
    expect(await checkTestLink(identity(), "nope")).toEqual({ ok: false, reason: "invalid" });
    expect(await checkTestLink(identity(), "abcdefghjk", now)).toEqual({ ok: false, reason: "invalid" });
    expect(await checkTestLink(identity(), l.code, new Date(now.getTime() + 24 * 3_600_000 + 1000))).toEqual({ ok: false, reason: "expired" });
  });
  it("allows one report plus one retry, then no more", async () => {
    const l = await createTestLink(identity(), { label: "A" });
    const a = await consumeTestLink(identity(), l.code); expect(a.ok && a.remaining).toBe(1);
    const b = await consumeTestLink(identity(), l.code); expect(b.ok && b.remaining).toBe(0);
    expect(await consumeTestLink(identity(), l.code)).toEqual({ ok: false, reason: "used" });
  });
  it("cannot be double-spent by two taps at once", async () => {
    const l = await createTestLink(identity(), {});
    const res = await Promise.all([1, 2, 3, 4].map(() => consumeTestLink(identity(), l.code)));
    expect(res.filter((r) => r.ok).length).toBe(1); // simultaneous taps: exactly one wins, the rest are told to retry
    const after = await checkTestLink(identity(), l.code);
    expect(after.ok && after.remaining).toBe(1); // the redo is still there
    expect(res.every((r) => r.ok || r.reason === "used")).toBe(true);
  });
  it("offers a retry link only while attempts remain", async () => {
    const l = await createTestLink(identity(), { label: "Sita" });
    await consumeTestLink(identity(), l.code); await recordUse(identity(), l.id, "p1");
    expect((await retryFor(identity(), "p1"))?.code).toBe(l.code);
    await consumeTestLink(identity(), l.code);
    expect(await retryFor(identity(), "p1")).toBeNull();
    expect(await retryFor(identity(), "unknown")).toBeNull();
  });
});

const draftEx = (r: { draft: Draft | null; retryable: boolean }) => async () => r;

describe("pending reports and Gemini retry", () => {
  async function setup() {
    const { profileId } = await saveIntake({ identity: identity(), anonymous: anonymous() }, intakeSchema.parse(validIntake()));
    const token = await createPending(anonymous(), profileId, { testMode: true });
    return { profileId, token };
  }
  it("keeps waiting (with a pause) while Gemini is busy, and does not run twice during the pause", async () => {
    const { token } = await setup();
    const t0 = new Date("2026-11-10T10:00:00Z");
    const r1 = await prepareReport(anonymous(), token, draftEx({ draft: null, retryable: true }), t0);
    expect(r1.status).toBe("pending"); expect(r1.waitSeconds).toBeGreaterThan(0);
    let calls = 0;
    const r2 = await prepareReport(anonymous(), token, async () => { calls++; return { draft: null, retryable: true }; }, new Date(t0.getTime() + 2000));
    expect(r2.status).toBe("pending"); expect(calls).toBe(0);
  });
  it("falls back to the rule-based report after the last try, and shows it straight away in pilot mode", async () => {
    const { token } = await setup();
    let t = new Date("2026-11-10T10:00:00Z"); let last = { status: "pending" } as { status: string };
    for (let i = 0; i < MAX_TRIES + 1 && last.status === "pending"; i++) {
      last = await prepareReport(anonymous(), token, draftEx({ draft: null, retryable: true }), t);
      t = new Date(t.getTime() + 120_000);
    }
    expect(last.status).toBe("ready");
    const { data } = await anonymous().from("reports").select("*").eq("access_token", token).single();
    expect(data.source).toBe("template"); expect(data.report.testMode).toBe(true); expect(data.report.guide).toBeTruthy(); expect(data.attempts).toBe(MAX_TRIES);
  });
  it("builds at once when the AI answers, and a second call changes nothing", async () => {
    const { token } = await setup();
    const r = await prepareReport(anonymous(), token, draftEx({ draft: null, retryable: false }));
    expect(r.status).toBe("ready");
    const again = await prepareReport(anonymous(), token, async () => { throw new Error("must not run"); });
    expect(again.status).toBe("ready");
  });
  it("reports an unknown token", async () => {
    expect((await prepareReport(anonymous(), "x".repeat(30))).status).toBe("unknown");
  });
});

describe("pilot admin data and CSV", () => {
  it("joins link, answers, report and feedback, and keeps typed notes from running as spreadsheet formulas", async () => {
    const l = await createTestLink(identity(), { label: "=HYPERLINK(1)", note: "a, \"quoted\" note" });
    await consumeTestLink(identity(), l.code);
    const { profileId } = await saveIntake({ identity: identity(), anonymous: anonymous() }, intakeSchema.parse({ ...validIntake(), contact: { name: l.label, phone: "0000000000" } }));
    await recordUse(identity(), l.id, profileId);
    const token = await createPending(anonymous(), profileId, { testMode: true });
    await prepareReport(anonymous(), token, draftEx({ draft: null, retryable: false }));
    await anonymous().from("feedback").insert({ profile_id: profileId, rating: 4, felt_wrong: "-2 sizes too big", liked: "Palette", notes_tags: ["colours-right"] });
    const { links, entries } = await listPilot(identity(), anonymous());
    expect(links[0].uses).toBe(1); expect(links[0].state).toBe("active");
    expect(entries).toHaveLength(1);
    expect(entries[0].answers?.ageRange).toBe("25-30"); expect(entries[0].report?.status).toBe("ready"); expect(entries[0].feedback?.rating).toBe(4);
    const csv = toCsv(entries, "https://x.test");
    expect(csv).toContain("'=HYPERLINK(1)"); expect(csv).toContain('"a, ""quoted"" note"'); expect(csv).toContain("'-2 sizes too big");
    expect(csv).toContain(`https://x.test/r/${token}`);
    expect(await labelFor(identity(), profileId)).toBe("=HYPERLINK(1)");
  });
});
