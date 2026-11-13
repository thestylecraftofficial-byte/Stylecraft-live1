import { describe, expect, it } from "vitest";
import { checkToken, createLimiter, makeToken, SESSION_HOURS } from "../lib/adminauth";

describe("admin session", () => {
  const pw = "a-long-admin-password";
  it("accepts a fresh token and rejects it after it expires", async () => {
    const now = Date.now(); const t = await makeToken(pw, now);
    expect(await checkToken(t, pw, now + 1000)).toBe(true);
    expect(await checkToken(t, pw, now + SESSION_HOURS * 3_600_000 + 1)).toBe(false);
  });
  it("rejects wrong passwords, edited tokens and empty input", async () => {
    const t = await makeToken(pw);
    expect(await checkToken(t, "other-password")).toBe(false); // changing the password signs everyone out
    const [exp, sig] = t.split(".");
    expect(await checkToken(`${Number(exp) + 9_999_999}.${sig}`, pw)).toBe(false);
    expect(await checkToken(`${exp}.${"0".repeat(sig.length)}`, pw)).toBe(false);
    for (const bad of [undefined, null, "", "x", "1.2", "abc.def"]) expect(await checkToken(bad as string, pw)).toBe(false);
    expect(await checkToken(t, undefined)).toBe(false);
  });
});

describe("login lock-out", () => {
  it("locks after five wrong tries, per visitor, and unlocks after the wait", () => {
    const l = createLimiter(5, 60_000); const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) l.fail("a", t0);
    expect(l.locked("a", t0)).toBe(false);
    l.fail("a", t0); expect(l.locked("a", t0 + 1)).toBe(true);
    expect(l.locked("b", t0)).toBe(false);
    expect(l.locked("a", t0 + 60_001)).toBe(false);
  });
  it("forgets earlier mistakes after a right password", () => {
    const l = createLimiter(3, 60_000);
    l.fail("a"); l.fail("a"); l.ok("a"); l.fail("a"); l.fail("a");
    expect(l.locked("a")).toBe(false);
  });
});
