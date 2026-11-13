import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// A report can only be started with a link made in /admin. Each link lasts 24 hours and gives one report plus one redo.
export const LINK_HOURS = 24;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alike characters
export const CODE = /^[a-z2-9]{10}$/;
const newCode = () => Array.from(randomBytes(10), (b) => ALPHABET[b % ALPHABET.length]).join("");

export type TestLink = { id: string; code: string; label: string; note: string | null; expires_at: string; attempts: number; max_attempts: number; created_at: string };

export async function createTestLink(identity: SupabaseClient, input: { label?: string; note?: string }, now = new Date()) {
  const label = (input.label ?? "").trim().slice(0, 80) || "Friend";
  const note = (input.note ?? "").trim().slice(0, 300) || null;
  for (let i = 0; i < 3; i++) {
    const code = newCode();
    const { data, error } = await identity.from("test_links")
      .insert({ code, label, note, expires_at: new Date(now.getTime() + LINK_HOURS * 3_600_000).toISOString() }).select("*").single();
    if (!error && data) return data as TestLink;
  }
  throw new Error("could not create link");
}

export type LinkState =
  | { ok: true; link: TestLink; remaining: number }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export async function checkTestLink(identity: SupabaseClient, code: string | null | undefined, now = new Date()): Promise<LinkState> {
  if (!code || !CODE.test(code)) return { ok: false, reason: "invalid" };
  const { data } = await identity.from("test_links").select("*").eq("code", code).maybeSingle();
  if (!data) return { ok: false, reason: "invalid" };
  const link = data as TestLink;
  if (new Date(link.expires_at) <= now) return { ok: false, reason: "expired" };
  if (link.attempts >= link.max_attempts) return { ok: false, reason: "used" };
  return { ok: true, link, remaining: link.max_attempts - link.attempts };
}

// Uses up one attempt. The update only succeeds if nobody else used the link in between, so two quick taps cannot get three reports.
export async function consumeTestLink(identity: SupabaseClient, code: string, now = new Date()): Promise<LinkState> {
  const st = await checkTestLink(identity, code, now);
  if (!st.ok) return st;
  const { data } = await identity.from("test_links").update({ attempts: st.link.attempts + 1 })
    .eq("id", st.link.id).eq("attempts", st.link.attempts).select("id");
  if (!data || data.length === 0) return { ok: false, reason: "used" };
  return { ok: true, link: { ...st.link, attempts: st.link.attempts + 1 }, remaining: st.remaining - 1 };
}

export async function recordUse(identity: SupabaseClient, linkId: string, profileId: string) {
  await identity.from("test_link_uses").insert({ link_id: linkId, profile_id: profileId });
}

// For a report page: the link its profile came from, and whether a retry is still open.
export async function retryFor(identity: SupabaseClient, profileId: string, now = new Date()): Promise<{ code: string; label: string } | null> {
  const { data: use } = await identity.from("test_link_uses").select("link_id").eq("profile_id", profileId).maybeSingle();
  if (!use) return null;
  const { data } = await identity.from("test_links").select("*").eq("id", use.link_id).maybeSingle();
  if (!data) return null;
  const l = data as TestLink;
  if (l.attempts >= l.max_attempts || new Date(l.expires_at) <= now) return null;
  return { code: l.code, label: l.label };
}

export async function labelFor(identity: SupabaseClient, profileId: string): Promise<string | null> {
  const { data: link } = await identity.from("links").select("customer_id").eq("profile_id", profileId).maybeSingle();
  if (!link) return null;
  const { data } = await identity.from("customers").select("name").eq("id", link.customer_id).maybeSingle();
  const name = (data?.name as string) ?? null;
  return name && name !== "Friend" ? name : null; // a link with no name shows "You" on the cover
}
