import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { profileSchema, type Profile } from "../schema";
import { PROMPT_VERSION, DEFAULT_MODEL, generateDraftEx, type DraftResult } from "../ai/gemini";
import { buildLimits } from "../rules/engine";
import { assembleReport, buildReport, type DraftFn } from "./build";

// Rebuilds the form profile from the anonymous row. No identity data is read here.
export function profileFromRow(r: Record<string, any>): Profile { // eslint-disable-line @typescript-eslint/no-explicit-any
  return profileSchema.parse({
    ageRange: r.age_range, presentation: r.style_presentation, cityZone: r.city_zone, occasions: r.occasions,
    stylePrefs: r.style_prefs, likedColours: r.liked_colours, dislikedColours: r.disliked_colours,
    fitPreference: r.fit_preference, budgetBand: r.budget_band, categories: r.categories,
    measurements: r.measurements, undertone: r.undertone_answers, photoHint: r.photo_hints ?? null,
  });
}

export async function generateAndStore(anonymous: SupabaseClient, profileId: string, draftFn?: DraftFn, tier: "card" | "report" = "report") {
  const { data: existing } = await anonymous.from("reports").select("id,status").eq("profile_id", profileId).maybeSingle();
  if (existing) return { created: false as const, status: existing.status as string };

  const { data: row, error } = await anonymous.from("profiles").select("*").eq("id", profileId).single();
  if (error || !row) throw new Error("profile not found");

  const report = await buildReport(profileFromRow(row), draftFn, tier);
  const status = report.review.needsReview ? "flagged" : "ready";
  const { error: iErr } = await anonymous.from("reports").insert({
    profile_id: profileId,
    rule_version: report.rulesVersion,
    prompt_version: PROMPT_VERSION,
    model_name: report.source === "template" ? null : DEFAULT_MODEL,
    status,
    report,
    access_token: randomBytes(24).toString("base64url"),
    tier,
    source: report.source,
    needs_review: report.review.needsReview,
    changed_share: report.review.itemsTotal ? report.review.itemsChanged / report.review.itemsTotal : 0,
  });
  if (iErr) {
    if (iErr.code === "23505") return { created: false as const, status }; // another request won the race
    throw new Error("report insert: " + iErr.message);
  }
  return { created: true as const, status };
}

// ---------------------------------------------------------------- pending reports (pilot / busy-Gemini flow)
// The report row is created first (status "pending", with its link token). The report page then asks /api/report/prepare to
// build it. If Gemini is busy, the row keeps its place and is retried with a pause, so the visitor never sees an error.
export const MAX_TRIES = 3; // every failed call still counts against the Gemini quota, so few tries
const BACKOFF_S = [20, 60];
const LEASE_S = 75; // one attempt at a time

export async function createPending(anonymous: SupabaseClient, profileId: string, opts: { tier?: "card" | "report"; testMode?: boolean } = {}) {
  const token = randomBytes(24).toString("base64url");
  const { error } = await anonymous.from("reports").insert({
    profile_id: profileId, status: "pending", access_token: token, tier: opts.tier ?? "report", test_mode: !!opts.testMode, attempts: 0,
    rule_version: null, prompt_version: PROMPT_VERSION,
  });
  if (error) throw new Error("pending insert: " + error.message);
  return token;
}

export type PrepareResult = { status: "pending" | "ready" | "flagged" | "delivered" | "unknown"; waitSeconds?: number };
export type DraftExFn = (p: Profile, limits: ReturnType<typeof buildLimits>) => Promise<DraftResult>;

export async function prepareReport(anonymous: SupabaseClient, token: string, draftEx: DraftExFn = generateDraftEx, now = new Date()): Promise<PrepareResult> {
  const { data: row } = await anonymous.from("reports").select("*").eq("access_token", token).maybeSingle();
  if (!row) return { status: "unknown" };
  if (row.status !== "pending") return { status: row.status };
  if (row.retry_after && new Date(row.retry_after) > now) return { status: "pending", waitSeconds: Math.ceil((new Date(row.retry_after).getTime() - now.getTime()) / 1000) };

  // Claim this attempt. Only one caller can move attempts from n to n+1.
  const lease = new Date(now.getTime() + LEASE_S * 1000).toISOString();
  const { data: claimed } = await anonymous.from("reports").update({ attempts: row.attempts + 1, retry_after: lease })
    .eq("id", row.id).eq("attempts", row.attempts).eq("status", "pending").select("id");
  if (!claimed || claimed.length === 0) return { status: "pending", waitSeconds: 5 };

  const { data: prof } = await anonymous.from("profiles").select("*").eq("id", row.profile_id).single();
  if (!prof) return { status: "unknown" };
  const profile = profileFromRow(prof);
  const tier = (row.tier ?? "report") as "card" | "report";
  const tries = row.attempts + 1;

  let ai = null as Awaited<ReturnType<DraftExFn>>["draft"];
  let retryable = false;
  if (tier !== "card") {
    const r = await draftEx(profile, buildLimits(profile));
    ai = r.draft; retryable = r.retryable;
    if (!ai && retryable && tries < MAX_TRIES) {
      const wait = BACKOFF_S[Math.min(tries - 1, BACKOFF_S.length - 1)];
      await anonymous.from("reports").update({ retry_after: new Date(now.getTime() + wait * 1000).toISOString() }).eq("id", row.id);
      return { status: "pending", waitSeconds: wait };
    }
  }
  const report = assembleReport(profile, ai, tier, { testMode: !!row.test_mode });
  // Pilot reports are shown straight away (the admin still sees the review flag). Normal reports wait for approval when flagged.
  const status = row.test_mode ? "ready" : report.review.needsReview ? "flagged" : "ready";
  const { error } = await anonymous.from("reports").update({
    status, report, rule_version: report.rulesVersion, model_name: report.source === "template" ? null : DEFAULT_MODEL, source: report.source,
    needs_review: report.review.needsReview, retry_after: null,
    changed_share: report.review.itemsTotal ? report.review.itemsChanged / report.review.itemsTotal : 0,
  }).eq("id", row.id).eq("status", "pending");
  if (error) throw new Error("report update: " + error.message);
  return { status: status as PrepareResult["status"] };
}
