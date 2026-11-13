import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------- waitlist
// The waitlist page (public/waitlist.html) sends: email, name, city, interests, consent, consentVersion, source, hp (hidden trap field).
export const CITIES = ["Hyderabad", "Bengaluru", "Mumbai", "Delhi NCR", "Chennai", "Pune", "Other"];
export const INTERESTS = [["Style discovery", "Discovering my style"], ["Personal styling", "Personal styling"], ["Weddings", "Weddings and occasions"]] as const;
export const AREAS = CITIES.map((c) => [c, c] as const);
const INTEREST_VALUES = INTERESTS.map((i) => i[0]) as [string, ...string[]];

export const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  name: z.string().trim().min(1).max(60),
  city: z.enum(CITIES as [string, ...string[]]).or(z.literal("")).optional().default(""),
  interests: z.array(z.enum(INTEREST_VALUES)).max(6).default([]),
  consent: z.literal(true),
  consentVersion: z.string().trim().min(1).max(30),
  source: z.string().trim().max(80).optional().default(""),
  hp: z.string().max(200).optional(), // hidden trap field: real people leave it empty
});

const phone = z.string().trim().regex(/^\+?[0-9 ]{10,14}$/, "Enter a valid phone number");

// ---------------------------------------------------------------- stylists
export const STYLIST_CONSENT_VERSION = "2026-11-s1";
export const STYLIST_CONSENT = "StyleCraft may save these details and my portfolio link to consider me for its stylist team, and contact me about it. I can ask for them to be deleted at any time.";
export const EXPERIENCE = [["under-1", "Under 1 year"], ["1-3", "1 to 3 years"], ["3-5", "3 to 5 years"], ["5-plus", "5+ years"]] as const;
export const SPECIALITIES = [["mens", "Men's styling"], ["womens", "Women's styling"], ["ethnic", "Ethnic wear and sarees"], ["wedding", "Wedding styling"], ["grooming", "Grooming and hair"]] as const;
export const AVAILABILITY = [["weekends", "Weekends"], ["weekdays", "Weekdays"], ["flexible", "Flexible"]] as const;
export const STATUSES = ["new", "shortlisted", "contacted", "rejected"] as const;

export const stylistSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone,
  email: z.string().trim().email().max(120),
  city: z.string().trim().min(1).max(60),
  experience: z.enum(EXPERIENCE.map((a) => a[0]) as [string, ...string[]]),
  specialities: z.array(z.enum(SPECIALITIES.map((a) => a[0]) as [string, ...string[]])).min(1).max(5),
  languages: z.string().trim().max(100).optional().or(z.literal("")),
  portfolioUrl: z.string().trim().max(300).regex(/^https:\/\/[^\s]+$/, "Use a link that starts with https://").optional().or(z.literal("")),
  about: z.string().trim().max(600).optional().or(z.literal("")),
  availability: z.enum(AVAILABILITY.map((a) => a[0]) as [string, ...string[]]),
  consent: z.literal(true),
  website: z.string().max(200).optional(),
});

const digits = (p: string) => p.replace(/[^0-9+]/g, "");

// A repeat sign-up from the same email is treated as success, so the form never reveals who is already on the list.
// Returns true only for a brand-new sign-up, so the thank-you email goes out once.
export async function addWaitlist(identity: SupabaseClient, v: z.infer<typeof waitlistSchema>): Promise<boolean> {
  const { error } = await identity.from("waitlist").insert({ name: v.name, email: v.email, area: v.city, interests: v.interests, source: v.source || null, consent_version: v.consentVersion });
  if (error && !/duplicate|unique/i.test(error.message)) throw new Error("waitlist insert: " + error.message);
  return !error;
}
export async function addStylist(identity: SupabaseClient, v: z.infer<typeof stylistSchema>) {
  const { error } = await identity.from("stylist_applications").insert({
    name: v.name, phone: digits(v.phone), email: v.email, city: v.city, experience: v.experience, specialities: v.specialities,
    languages: v.languages || null, portfolio_url: v.portfolioUrl || null, about: v.about || null, availability: v.availability, consent_version: STYLIST_CONSENT_VERSION,
  });
  if (error && !/duplicate|unique/i.test(error.message)) throw new Error("stylist insert: " + error.message);
}

export type WaitlistRow = { id: string; name: string; phone: string | null; email: string | null; area: string; interests: string[]; created_at: string; source?: string | null; mail_status?: string };
export type StylistRow = { id: string; name: string; phone: string; email: string; city: string; experience: string; specialities: string[]; languages: string | null; portfolio_url: string | null; about: string | null; availability: string; status: (typeof STATUSES)[number]; created_at: string };

export async function listPeople(identity: SupabaseClient) {
  const [{ data: w }, { data: s }] = await Promise.all([
    identity.from("waitlist").select("*").order("created_at", { ascending: false }),
    identity.from("stylist_applications").select("*").order("created_at", { ascending: false }),
  ]);
  return { waitlist: (w ?? []) as WaitlistRow[], stylists: (s ?? []) as StylistRow[] };
}

export async function setStylistStatus(identity: SupabaseClient, id: string, status: string) {
  if (!(STATUSES as readonly string[]).includes(status)) throw new Error("bad status");
  await identity.from("stylist_applications").update({ status }).eq("id", id);
}
export async function deletePerson(identity: SupabaseClient, kind: "waitlist" | "stylist", id: string) {
  await identity.from(kind === "waitlist" ? "waitlist" : "stylist_applications").delete().eq("id", id);
}

export const label = (list: readonly (readonly [string, string])[], v: string) => list.find((x) => x[0] === v)?.[1] ?? v;
