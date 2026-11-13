import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONSENT_VERSION } from "./consent";
import type { Intake } from "./schema";

export type Stores = { identity: SupabaseClient; anonymous: SupabaseClient };

// Writes the anonymous profile first (random id, no personal data), then the identity row,
// then the link that joins them. If a later step fails, earlier rows are removed so nothing is half-saved.
export async function saveIntake({ identity, anonymous }: Stores, input: Intake) {
  const profileId = randomUUID();
  const p = input.profile;

  const { error: pErr } = await anonymous.from("profiles").insert({
    id: profileId,
    age_range: p.ageRange,
    style_presentation: p.presentation,
    city_zone: p.cityZone,
    occasions: p.occasions,
    style_prefs: p.stylePrefs,
    liked_colours: p.likedColours,
    disliked_colours: p.dislikedColours,
    fit_preference: p.fitPreference,
    budget_band: p.budgetBand,
    categories: p.categories,
    measurements: p.measurements,
    undertone_answers: p.undertone,
    photo_hints: p.photoHint ?? null,
    keep_anonymous: input.consent.keepAnonymous,
  });
  if (pErr) throw new Error("profile: " + pErr.message);

  const { data: cust, error: cErr } = await identity
    .from("customers")
    .insert({
      name: input.contact.name,
      phone: input.contact.phone,
      email: input.contact.email || null,
    })
    .select("id")
    .single();
  if (cErr || !cust) {
    await anonymous.from("profiles").delete().eq("id", profileId);
    throw new Error("customer: " + (cErr?.message ?? "no row"));
  }

  const { error: lErr } = await identity.from("links").insert({ customer_id: cust.id, profile_id: profileId });
  if (lErr) {
    await identity.from("customers").delete().eq("id", cust.id);
    await anonymous.from("profiles").delete().eq("id", profileId);
    throw new Error("link: " + lErr.message);
  }

  const { error: kErr } = await anonymous.from("consent_log").insert({
    profile_id: profileId,
    consent_version: CONSENT_VERSION,
    items: input.consent.accepted,
    keep_anonymous: input.consent.keepAnonymous,
  });
  if (kErr) throw new Error("consent: " + kErr.message);

  return { profileId };
}

// Called when the report is delivered. Starts the retention clock for identity data.
export async function markDelivered({ identity, anonymous }: Stores, profileId: string, retentionDays: number) {
  const now = new Date();
  const deleteAfter = new Date(now.getTime() + retentionDays * 86_400_000);
  const { error } = await identity
    .from("links")
    .update({ report_delivered_at: now.toISOString(), delete_after: deleteAfter.toISOString() })
    .eq("profile_id", profileId);
  if (error) throw new Error("deliver: " + error.message);
  await anonymous.from("reports").update({ status: "delivered" }).eq("profile_id", profileId);
}
