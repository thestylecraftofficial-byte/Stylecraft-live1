import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OCCASIONS } from "../schema";
import { prepareUpload } from "./image";

export const BUCKET = "outfit-checks";
export const PHOTO_DAYS = 7;
export const CHECK_CONSENT_ID = "outfit_photo";

export type SubmitResult = { ok: true } | { ok: false; reason: "not-found" | "not-eligible" | "already-used" | "bad-occasion" | "too-big" | "not-jpeg" | "failed" };

// One free check per full report. The slot is claimed first so two uploads at once cannot both succeed,
// and handed back if anything after it fails.
export async function submitCheck(anonymous: SupabaseClient, token: string, occasion: string, photo: Uint8Array, retentionDays = PHOTO_DAYS): Promise<SubmitResult> {
  if (!(OCCASIONS as readonly string[]).includes(occasion)) return { ok: false, reason: "bad-occasion" };
  const prepared = prepareUpload(photo);
  if (!prepared.ok) return { ok: false, reason: prepared.reason };

  const { data: rep } = await anonymous.from("reports").select("profile_id,tier,status,checks_used").eq("access_token", token).maybeSingle();
  if (!rep) return { ok: false, reason: "not-found" };
  if (rep.tier !== "report" || !["ready", "delivered"].includes(rep.status)) return { ok: false, reason: "not-eligible" };

  const { data: claimed } = await anonymous.from("reports").update({ checks_used: 1 }).eq("access_token", token).lt("checks_used", 1).select("profile_id");
  if (!claimed?.length) return { ok: false, reason: "already-used" };
  const release = () => anonymous.from("reports").update({ checks_used: 0 }).eq("access_token", token);

  const path = `${rep.profile_id}/${randomUUID()}.jpg`;
  try {
    const up = await anonymous.storage.from(BUCKET).upload(path, prepared.data, { contentType: "image/jpeg", upsert: false });
    if (up.error) throw new Error("upload");
    const { error } = await anonymous.from("outfit_checks").insert({
      profile_id: rep.profile_id, storage_path: path, occasion,
      delete_after: new Date(Date.now() + retentionDays * 86_400_000).toISOString(),
    });
    if (error) { await anonymous.storage.from(BUCKET).remove([path]); throw new Error("row"); }
    const { data: prof } = await anonymous.from("profiles").select("keep_anonymous").eq("id", rep.profile_id).maybeSingle();
    await anonymous.from("consent_log").insert({ profile_id: rep.profile_id, consent_version: "outfit-check-v1", items: [CHECK_CONSENT_ID], keep_anonymous: prof?.keep_anonymous ?? false });
    return { ok: true };
  } catch {
    await release();
    return { ok: false, reason: "failed" };
  }
}

export async function listPendingChecks(anonymous: SupabaseClient) {
  const { data } = await anonymous.from("outfit_checks").select("id,profile_id,storage_path,occasion,created_at").eq("status", "pending").order("created_at");
  const rows = data ?? [];
  return Promise.all(rows.map(async (r) => {
    const { data: s } = await anonymous.storage.from(BUCKET).createSignedUrl(r.storage_path, 300);
    return { id: r.id as string, profileId: r.profile_id as string, occasion: r.occasion as string, createdAt: r.created_at as string, photoUrl: s?.signedUrl ?? null };
  }));
}

export async function answerCheck(anonymous: SupabaseClient, checkId: string, feedback: string) {
  const text = feedback.trim().slice(0, 1500);
  if (text.length < 10) return { ok: false as const, reason: "too-short" };
  const { data: row } = await anonymous.from("outfit_checks").select("profile_id,occasion,status").eq("id", checkId).maybeSingle();
  if (!row || row.status !== "pending") return { ok: false as const, reason: "not-pending" };
  const { error } = await anonymous.from("outfit_feedback").insert({ profile_id: row.profile_id, occasion: row.occasion, feedback: text });
  if (error) throw new Error("feedback insert");
  await anonymous.from("outfit_checks").update({ status: "answered" }).eq("id", checkId);
  return { ok: true as const };
}

export async function checkStateByToken(anonymous: SupabaseClient, token: string) {
  const { data: rep } = await anonymous.from("reports").select("profile_id,tier,status,checks_used").eq("access_token", token).maybeSingle();
  if (!rep || !["ready", "delivered"].includes(rep.status)) return null;
  const { data: fb } = await anonymous.from("outfit_feedback").select("occasion,feedback,created_at").eq("profile_id", rep.profile_id).order("created_at");
  const { data: pending } = await anonymous.from("outfit_checks").select("id").eq("profile_id", rep.profile_id).eq("status", "pending");
  return { eligible: rep.tier === "report", used: rep.checks_used >= 1, waiting: (pending?.length ?? 0) > 0, feedback: fb ?? [] };
}
