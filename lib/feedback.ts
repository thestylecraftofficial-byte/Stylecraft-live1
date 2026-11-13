import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const FEEDBACK_TAGS = [
  ["colours-right", "Colours felt right"], ["colours-off", "Colours felt off"], ["outfits-useful", "Outfits were useful"],
  ["outfits-pricey", "Outfits too expensive"], ["fit-helpful", "Fit advice helped"], ["fit-off", "Fit advice was off"],
  ["easy-to-follow", "Easy to follow"], ["too-long", "Too long"],
] as const;
const TAG_IDS = FEEDBACK_TAGS.map((t) => t[0]) as [string, ...string[]];

export const feedbackSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/),
  rating: z.number().int().min(1).max(5),
  wouldPay: z.boolean().optional(),
  tags: z.array(z.enum(TAG_IDS)).max(8).default([]),
  // Pilot questions. Free text, kept short; the form tells people not to type phone numbers or addresses.
  feltWrong: z.string().trim().max(600).optional(),
  liked: z.string().trim().max(600).optional(),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;

// A 1-5 rating (how accurate it felt), optional tags, and two short optional notes.
export async function saveFeedback(anonymous: SupabaseClient, f: FeedbackInput): Promise<"saved" | "exists" | "not-found"> {
  const { data: rep } = await anonymous.from("reports").select("profile_id,status").eq("access_token", f.token).maybeSingle();
  if (!rep || !["ready", "delivered"].includes(rep.status)) return "not-found";
  const { data: old } = await anonymous.from("feedback").select("id").eq("profile_id", rep.profile_id).maybeSingle();
  if (old) return "exists";
  const { error } = await anonymous.from("feedback").insert({ profile_id: rep.profile_id, rating: f.rating, would_pay: f.wouldPay ?? null, notes_tags: f.tags, felt_wrong: f.feltWrong || null, liked: f.liked || null });
  if (error) throw new Error("feedback insert");
  return "saved";
}

export async function hasFeedback(anonymous: SupabaseClient, token: string) {
  const { data: rep } = await anonymous.from("reports").select("profile_id").eq("access_token", token).maybeSingle();
  if (!rep) return false;
  const { data } = await anonymous.from("feedback").select("id").eq("profile_id", rep.profile_id).maybeSingle();
  return !!data;
}

export async function feedbackSummary(anonymous: SupabaseClient) {
  const { data } = await anonymous.from("feedback").select("rating,would_pay,notes_tags");
  const rows = data ?? [];
  const n = rows.length;
  const tags = new Map<string, number>();
  rows.forEach((r) => (r.notes_tags as string[]).forEach((t) => tags.set(t, (tags.get(t) ?? 0) + 1)));
  const label = new Map<string, string>(FEEDBACK_TAGS.map((t) => [t[0], t[1]]));
  return {
    count: n,
    avgRating: n ? rows.reduce((s, r) => s + (r.rating ?? 0), 0) / n : 0,
    wouldPayShare: n ? rows.filter((r) => r.would_pay).length / n : 0,
    topTags: [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, c]) => ({ tag: label.get(t) ?? t, count: c })),
  };
}
