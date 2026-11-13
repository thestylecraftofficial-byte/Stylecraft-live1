import type { SupabaseClient } from "@supabase/supabase-js";
import type { Report } from "./report/types";
import { profileFromRow } from "./report/load";
import { profileSummary } from "./report/build";
import type { TestLink } from "./testmode";

export type PilotEntry = {
  linkId: string; label: string; note: string | null; linkCreated: string;
  profileId: string; usedAt: string;
  report: { token: string; status: string; source: string | null; report: Report | null } | null;
  answers: ReturnType<typeof profileSummary> | null;
  feedback: { rating: number | null; feltWrong: string | null; liked: string | null; tags: string[]; at: string } | null;
};
export type LinkRow = TestLink & { state: "active" | "expired" | "used up"; uses: number };

export async function listPilot(identity: SupabaseClient, anonymous: SupabaseClient, now = new Date()) {
  const { data: links } = await identity.from("test_links").select("*").order("created_at", { ascending: false });
  const { data: uses } = await identity.from("test_link_uses").select("*");
  const L = (links ?? []) as TestLink[];
  const rows: LinkRow[] = L.map((l) => ({
    ...l, uses: (uses ?? []).filter((u) => u.link_id === l.id).length,
    state: l.attempts >= l.max_attempts ? "used up" : new Date(l.expires_at) <= now ? "expired" : "active",
  }));

  const byLink = new Map(L.map((l) => [l.id, l]));
  const ids = (uses ?? []).map((u) => u.profile_id as string);
  const entries: PilotEntry[] = [];
  if (ids.length) {
    const [{ data: reports }, { data: profiles }, { data: fbs }] = await Promise.all([
      anonymous.from("reports").select("profile_id,access_token,status,source,report").in("profile_id", ids),
      anonymous.from("profiles").select("*").in("id", ids),
      anonymous.from("feedback").select("*").in("profile_id", ids),
    ]);
    for (const u of uses ?? []) {
      const l = byLink.get(u.link_id); if (!l) continue;
      const rep = (reports ?? []).find((r) => r.profile_id === u.profile_id);
      const prof = (profiles ?? []).find((p) => p.id === u.profile_id);
      const fb = (fbs ?? []).find((f) => f.profile_id === u.profile_id);
      let answers: PilotEntry["answers"] = null;
      try { answers = prof ? profileSummary(profileFromRow(prof)) : null; } catch { /* old row shape */ }
      entries.push({
        linkId: l.id, label: l.label, note: l.note, linkCreated: l.created_at, profileId: u.profile_id, usedAt: u.created_at,
        report: rep ? { token: rep.access_token, status: rep.status, source: rep.source ?? null, report: (rep.report as Report) ?? null } : null,
        answers,
        feedback: fb ? { rating: fb.rating ?? null, feltWrong: fb.felt_wrong ?? null, liked: fb.liked ?? null, tags: fb.notes_tags ?? [], at: fb.created_at } : null,
      });
    }
    entries.sort((a, b) => (a.usedAt < b.usedAt ? 1 : -1));
  }
  return { links: rows, entries };
}

// Spreadsheet programs run text that starts with = + - @ as a formula. Prefixing a quote keeps typed notes inert.
export const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_HEAD = ["friend", "note", "link_created", "report_status", "report_source", "rules_version", "report_url", "style_dna", "undertone", "outfits", "items_changed_by_rules", "items_total",
  "age_range", "styled_for", "occasions", "styles", "fit", "budget", "measurements", "not_given", "photo_hint_used", "accuracy_1_to_5", "felt_wrong", "liked", "feedback_tags", "feedback_at"];

export function toCsv(entries: PilotEntry[], base: string) {
  const lines = [CSV_HEAD.join(",")];
  for (const e of entries) {
    const r = e.report?.report; const a = e.answers; const f = e.feedback;
    lines.push([
      e.label, e.note, e.linkCreated, e.report?.status, e.report?.source, r?.rulesVersion, e.report ? `${base}/r/${e.report.token}` : "", r?.styleDna.name, r?.undertone.value, r?.outfits.length,
      r?.review.itemsChanged, r?.review.itemsTotal, a?.ageRange, a?.presentation, a?.occasions.join("; "), a?.stylePrefs.join("; "), a?.fit, a?.budgetBand,
      a?.measurements.map((m) => `${m.label} ${m.value}`).join("; "), a?.missing.join("; "), a ? (a.photoUsed ? "yes" : "no") : "",
      f?.rating, f?.feltWrong, f?.liked, f?.tags.join("; "), f?.at,
    ].map(cell).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

import type { StylistRow, WaitlistRow } from "./people";
import { AREAS, INTERESTS, SPECIALITIES, EXPERIENCE, AVAILABILITY, label } from "./people";
const csv = (head: string[], rows: unknown[][]) => "\ufeff" + [head.join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n") + "\r\n";
export const waitlistCsv = (rows: WaitlistRow[]) => csv(["name", "email", "city", "interested_in", "source", "joined"],
  rows.map((r) => [r.name, r.email, r.area, r.interests.join("; "), r.source, r.created_at]));
export const stylistsCsv = (rows: StylistRow[]) => csv(["name", "phone", "email", "city", "experience", "specialities", "languages", "portfolio", "availability", "about", "status", "applied"],
  rows.map((r) => [r.name, r.phone, r.email, r.city, label(EXPERIENCE, r.experience), r.specialities.map((i) => label(SPECIALITIES, i)).join("; "), r.languages, r.portfolio_url, label(AVAILABILITY, r.availability), r.about, r.status, r.created_at]));
