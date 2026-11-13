import { describe, expect, it } from "vitest";
import { isJpeg, prepareUpload, stripJpegMetadata, MAX_BYTES } from "../lib/check/image";

const seg = (marker: number, payload: number[]) => [0xff, marker, (payload.length + 2) >> 8, (payload.length + 2) & 255, ...payload];
const jpeg = (...segs: number[][]) => Uint8Array.from([0xff, 0xd8, ...segs.flat(), 0xff, 0xda, 0, 3, 0, 1, 0x11, 0x22, 0x33, 0xff, 0xd9]);

describe("outfit photo cleaning", () => {
  const gps = Array.from("Exif\0\0GPSLATITUDE", (c) => c.charCodeAt(0));
  const original = jpeg(seg(0xe0, [74, 70, 73, 70, 0]), seg(0xe1, gps), seg(0xfe, [104, 105]), seg(0xdb, [1, 2, 3]));

  it("removes EXIF, comments and other metadata but keeps the picture data", () => {
    const out = stripJpegMetadata(original);
    const text = Buffer.from(out).toString("latin1");
    expect(text).not.toContain("GPSLATITUDE");
    expect(isJpeg(out)).toBe(true);
    expect(Array.from(out.slice(-5))).toEqual([0x11, 0x22, 0x33, 0xff, 0xd9]); // image data intact
    expect(out.length).toBeLessThan(original.length);
    expect(Buffer.from(out).includes(Buffer.from([0xff, 0xdb]))).toBe(true); // quantisation table kept
    expect(Buffer.from(out).includes(Buffer.from([0xff, 0xe0]))).toBe(true); // JFIF kept
  });
  it("rejects non-JPEG and oversized uploads", () => {
    expect(prepareUpload(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0])).ok).toBe(false);
    expect(prepareUpload(new Uint8Array(MAX_BYTES + 1)).ok).toBe(false);
    expect(prepareUpload(original).ok).toBe(true);
  });
  it("rejects truncated or broken JPEG structure", () => {
    expect(prepareUpload(Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 0])).ok).toBe(false);
  });
});

import { answerCheck, submitCheck } from "../lib/check/service";

function fakeDb(report: any, opts: { failUpload?: boolean; failRow?: boolean } = {}) {
  const log = { uploads: [] as string[], removed: [] as string[], rows: [] as any[], consent: [] as any[], quota: report?.checks_used ?? 0 };
  const db: any = {
    log,
    storage: { from: () => ({
      upload: async (p: string) => { if (opts.failUpload) return { error: {} }; log.uploads.push(p); return { error: null }; },
      remove: async (ps: string[]) => { log.removed.push(...ps); return {}; },
    }) },
    from: (name: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: name === "reports" ? report : { keep_anonymous: false } }) }) }),
      update: (v: any) => ({ eq: () => {
        const done = Object.assign(Promise.resolve({}), {
          lt: () => ({ select: async () => { if (log.quota < 1) { log.quota = v.checks_used; return { data: [{ profile_id: report.profile_id }] }; } return { data: [] }; } }),
        });
        if ("checks_used" in v && v.checks_used === 0) log.quota = 0;
        return done;
      } }),
      insert: async (row: any) => { if (name === "outfit_checks") { if (opts.failRow) return { error: {} }; log.rows.push(row); } if (name === "consent_log") log.consent.push(row); return { error: null }; },
    }),
  };
  return db;
}
const good = original0();
function original0() { return jpeg(seg(0xe0, [74, 70, 73, 70, 0]), seg(0xdb, [1, 2, 3])); }

describe("submitCheck", () => {
  const rep = { profile_id: "p1", tier: "report", status: "ready", checks_used: 0 };
  it("stores the photo with a 7-day delete date, logs consent, and uses up the free check", async () => {
    const db = fakeDb({ ...rep });
    const r = await submitCheck(db, "tok", "office", good);
    expect(r.ok).toBe(true);
    expect(db.log.uploads[0]).toMatch(/^p1\/.+\.jpg$/);
    const days = (new Date(db.log.rows[0].delete_after).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9); expect(days).toBeLessThan(7.1);
    expect(db.log.consent[0].items).toEqual(["outfit_photo"]);
    expect(db.log.quota).toBe(1);
  });
  it("refuses a second check, a card-tier report and a bad occasion", async () => {
    expect((await submitCheck(fakeDb({ ...rep, checks_used: 1 }), "tok", "office", good))).toEqual({ ok: false, reason: "already-used" });
    expect((await submitCheck(fakeDb({ ...rep, tier: "card" }), "tok", "office", good))).toEqual({ ok: false, reason: "not-eligible" });
    expect((await submitCheck(fakeDb({ ...rep }), "tok", "nonsense", good))).toEqual({ ok: false, reason: "bad-occasion" });
  });
  it("gives the free check back and removes the file if saving fails", async () => {
    const db = fakeDb({ ...rep }, { failRow: true });
    expect((await submitCheck(db, "tok", "office", good)).ok).toBe(false);
    expect(db.log.quota).toBe(0);
    expect(db.log.removed).toHaveLength(1);
    const db2 = fakeDb({ ...rep }, { failUpload: true });
    expect((await submitCheck(db2, "tok", "office", good)).ok).toBe(false);
    expect(db2.log.quota).toBe(0);
  });
});

describe("answerCheck", () => {
  it("rejects very short feedback", async () => {
    expect((await answerCheck({} as any, "id", "ok")).ok).toBe(false);
  });
});
