import { z } from "zod";
import { CONSENT_ITEMS } from "./consent";
import { FACE_SHAPES, SKIN_DEPTHS, UNDERTONE_HINTS } from "./photo/classify";

export const MEASUREMENT_FIELDS = ["height", "shoulder", "chest_or_bust", "waist", "hips", "inseam"] as const;

export const AGE_RANGES = ["18-24", "25-30", "31-40", "41-50", "51+"] as const;
export const PRESENTATIONS = ["menswear", "womenswear", "mixed"] as const;
// The form offers the first four. The Hyderabad values are kept so reports saved earlier still open.
export const CITY_ZONES = ["metro", "other-city", "town", "outside-india", "hyderabad-it-corridor", "hyderabad-other", "other-india"] as const;
export const OCCASIONS = ["everyday", "office", "parties", "formal", "wedding-guest", "festival", "date", "interview"] as const;
export const STYLES = ["smart-casual", "classic", "minimal", "street", "ethnic", "trendy", "sporty"] as const;
export const FITS = ["slim", "regular", "relaxed", "oversized", "not-sure"] as const;
export const BUDGETS = ["under-1500", "1500-3000", "3000-6000", "6000-plus"] as const;
export const CATEGORIES = ["western-men", "western-women", "ethnic-men", "ethnic-women", "footwear", "accessories"] as const;

// Plausible adult ranges in centimetres. They catch typos (a height of 20) and values typed in the wrong unit.
export const MEASURE_RANGE_CM: Record<(typeof MEASUREMENT_FIELDS)[number], [number, number]> = {
  height: [120, 230], shoulder: [30, 65], chest_or_bust: [60, 160], waist: [45, 160], hips: [60, 170], inseam: [45, 110],
};
const measurementFor = (f: (typeof MEASUREMENT_FIELDS)[number]) => z.object({
  value: z.number().min(MEASURE_RANGE_CM[f][0]).max(MEASURE_RANGE_CM[f][1]).nullable(),
  unsure: z.boolean(),
});

export const undertoneAnswers = z.object({
  veins: z.enum(["green", "blue", "mixed", "not-sure"]),
  sun: z.enum(["tans-easily", "burns-then-tans", "burns", "not-sure"]),
  jewellery: z.enum(["gold", "silver", "both", "not-sure"]),
  hair: z.enum(["black", "dark-brown", "brown", "lighter", "not-sure"]),
  eyes: z.enum(["black", "dark-brown", "brown", "lighter", "not-sure"]),
  // Optional: older saved profiles do not have it. Shown to the stylist; it does not change the colour rules.
  skinTone: z.enum(["fair", "light", "wheatish", "olive", "brown", "deep", "not-sure"]).optional(),
});

// Names and phone numbers must never reach the anonymous store, so contact is a separate object.
export const contactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().regex(/^\+?[0-9 ]{10,14}$/, "Enter a valid phone number"),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
});

export const profileSchema = z.object({
  ageRange: z.enum(AGE_RANGES),
  presentation: z.enum(PRESENTATIONS),
  cityZone: z.enum(CITY_ZONES),
  occasions: z.array(z.enum(OCCASIONS)).min(1).max(8),
  stylePrefs: z.array(z.enum(STYLES)).min(1).max(4),
  likedColours: z.array(z.string().min(2).max(24)).max(8),
  dislikedColours: z.array(z.string().min(2).max(24)).max(8),
  fitPreference: z.enum(FITS),
  budgetBand: z.enum(BUDGETS),
  categories: z.array(z.enum(CATEGORIES)).min(1),
  measurements: z.object(
    Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f, measurementFor(f)])) as Record<
      (typeof MEASUREMENT_FIELDS)[number],
      ReturnType<typeof measurementFor>
    >
  ),
  undertone: undertoneAnswers,
  // Labels read on the customer's own device and confirmed by them. Never the photo itself.
  photoHint: z
    .object({
      skinDepth: z.enum(SKIN_DEPTHS as [string, ...string[]]),
      undertoneHint: z.enum(UNDERTONE_HINTS as [string, ...string[]]),
      faceShape: z.enum(FACE_SHAPES as [string, ...string[]]),
    })
    .nullable()
    .optional(),
});

export const consentSchema = z.object({
  accepted: z.array(z.string()),
  keepAnonymous: z.boolean(),
});

export const intakeSchema = z
  .object({
    contact: contactSchema,
    profile: profileSchema,
    consent: consentSchema,
  })
  .superRefine((val, ctx) => {
    const required = CONSENT_ITEMS.filter((c) => c.required).map((c) => c.id as string);
    const missing = required.filter((id) => !val.consent.accepted.includes(id));
    if (missing.length) {
      ctx.addIssue({ code: "custom", path: ["consent"], message: "All required consent items must be accepted" });
    }
  });

export type Intake = z.infer<typeof intakeSchema>;
export type Profile = z.infer<typeof profileSchema>;
