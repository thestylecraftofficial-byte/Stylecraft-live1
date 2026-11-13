import { describe, it, expect } from "vitest";
import { generateDraftEx } from "../lib/ai/gemini";
import { buildLimits } from "../lib/rules/engine";
import { profileSchema } from "../lib/schema";
import { validIntake } from "./fixtures";

const p = profileSchema.parse(validIntake().profile);
const l = buildLimits(p);
const resp = (status: number) => new Response(JSON.stringify({ error: { message: "x" } }), { status });

describe("gemini quota guard", () => {
  it("does not repeat a call that can never work (bad key or model)", async () => {
    for (const status of [400, 401, 403]) {
      let n = 0;
      const r = await generateDraftEx(p, l, { apiKey: "k", fetchImpl: (async () => { n++; return resp(status); }) as unknown as typeof fetch });
      expect(n).toBe(1);
      expect(r.retryable).toBe(false);
    }
  });
  it("model not found: one call per model, then stops", async () => {
    let n = 0;
    const r = await generateDraftEx(p, l, { apiKey: "k", fetchImpl: (async () => { n++; return resp(404); }) as unknown as typeof fetch });
    expect(n).toBeLessThanOrEqual(2);
    expect(r.draft).toBeNull();
  });
  it("busy (429): at most one call per model, and asks to retry later", async () => {
    let n = 0;
    const r = await generateDraftEx(p, l, { apiKey: "k", fetchImpl: (async () => { n++; return resp(429); }) as unknown as typeof fetch });
    expect(n).toBeLessThanOrEqual(2);
    expect(r.retryable).toBe(true);
  });
});
