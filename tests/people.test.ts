import { beforeEach, describe, expect, it } from "vitest";
import { memoryClient } from "../lib/dev-memory-db";
import { addStylist, addWaitlist, deletePerson, listPeople, setStylistStatus, stylistSchema, waitlistSchema } from "../lib/people";
import { sendPendingThanks } from "../lib/waitlistmail";
import { thanksEmail, isLimitError } from "../lib/mail";
import { stylistsCsv, waitlistCsv } from "../lib/pilot";

const identity = () => memoryClient("identity");
beforeEach(() => { (globalThis as { __memdb?: unknown }).__memdb = undefined; });
const w = { name: "Asha", email: "Asha@X.com", city: "Hyderabad", interests: ["Weddings"], consent: true as const, consentVersion: "2026-11-v2", source: "instagram" };
const s = { name: "Ravi", phone: "+91 98765 11111", email: "r@x.com", city: "Hyderabad", experience: "3-5", specialities: ["mens"], availability: "weekends", consent: true as const, portfolioUrl: "https://example.com/p" };

describe("waitlist", () => {
  it("validates, lowercases the email and requires consent", () => {
    expect(waitlistSchema.parse(w).email).toBe("asha@x.com");
    expect(waitlistSchema.safeParse({ ...w, consent: false }).success).toBe(false);
    expect(waitlistSchema.safeParse({ ...w, email: "nope" }).success).toBe(false);
    expect(waitlistSchema.safeParse({ ...w, city: "Mars" }).success).toBe(false);
    expect(waitlistSchema.safeParse({ ...w, city: "" }).success).toBe(true);
    expect(waitlistSchema.safeParse({ ...w, interests: ["x"] }).success).toBe(false);
  });
  it("stores once per email (any letter case) and lists/deletes", async () => {
    expect(await addWaitlist(identity(), waitlistSchema.parse(w))).toBe(true);
    expect(await addWaitlist(identity(), waitlistSchema.parse({ ...w, name: "Again", email: "ASHA@x.com" }))).toBe(false);
    const p = await listPeople(identity());
    expect(p.waitlist).toHaveLength(1);
    expect(waitlistCsv(p.waitlist)).toContain("Asha");
    await deletePerson(identity(), "waitlist", p.waitlist[0].id);
    expect((await listPeople(identity())).waitlist).toHaveLength(0);
  });
});
describe("stylists", () => {
  it("rejects non-https portfolio links and empty specialities", () => {
    expect(stylistSchema.safeParse({ ...s, portfolioUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(stylistSchema.safeParse({ ...s, specialities: [] }).success).toBe(false);
    expect(stylistSchema.safeParse(s).success).toBe(true);
  });
  it("stores, changes status, exports safely", async () => {
    await addStylist(identity(), stylistSchema.parse({ ...s, about: "=HYPERLINK(\"x\")" }));
    const [row] = (await listPeople(identity())).stylists;
    expect(row.status).toBe("new");
    await setStylistStatus(identity(), row.id, "shortlisted");
    await expect(setStylistStatus(identity(), row.id, "bogus")).rejects.toThrow();
    const after = (await listPeople(identity())).stylists;
    expect(after[0].status).toBe("shortlisted");
    expect(stylistsCsv(after)).toContain("'=HYPERLINK");
  });
});

describe("waitlist thank-you email", () => {
  it("sends once, then not again", async () => {
    await addWaitlist(identity(), waitlistSchema.parse(w));
    const sent: string[] = [];
    const send = async (to: string) => { sent.push(to); return "sent" as const; };
    expect((await sendPendingThanks(identity(), { send })).sent).toBe(1);
    expect((await sendPendingThanks(identity(), { send })).sent).toBe(0);
    expect(sent).toEqual(["asha@x.com"]);
  });
  it("keeps the rest for tomorrow when Gmail's limit is reached, and sends them next run", async () => {
    for (let i = 0; i < 3; i++) await addWaitlist(identity(), waitlistSchema.parse({ ...w, email: `p${i}@x.com` }));
    let n = 0;
    const limited = async () => (n++ < 1 ? "sent" as const : "limit" as const);
    const r = await sendPendingThanks(identity(), { send: limited });
    expect(r).toEqual({ sent: 1, left: 2 });
    const next = await sendPendingThanks(identity(), { send: async () => "sent" });
    expect(next.sent).toBe(2);
    expect((await listPeople(identity())).waitlist.every((x) => x.mail_status === "sent")).toBe(true);
  });
  it("respects the daily cap", async () => {
    process.env.GMAIL_DAILY_LIMIT = "1";
    for (let i = 0; i < 2; i++) await addWaitlist(identity(), waitlistSchema.parse({ ...w, email: `q${i}@x.com` }));
    expect((await sendPendingThanks(identity(), { send: async () => "sent" })).sent).toBe(1);
    delete process.env.GMAIL_DAILY_LIMIT;
  });
  it("marks an address failed after repeated errors; template escapes the name", async () => {
    await addWaitlist(identity(), waitlistSchema.parse(w));
    for (let i = 0; i < 8; i++) await sendPendingThanks(identity(), { send: async () => "error" });
    expect((await listPeople(identity())).waitlist[0].mail_status).toBe("failed");
    expect(thanksEmail("<b>X</b>").html).not.toContain("<b>X</b>");
    expect(isLimitError({ response: "550 5.4.5 Daily user sending quota exceeded" })).toBe(true);
    expect(isLimitError({ response: "550 mailbox unavailable" })).toBe(false);
  });
});
