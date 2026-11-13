// Consent text shown on the form. Bump CONSENT_VERSION whenever the wording changes.
export const CONSENT_VERSION = "2026-11-v4";

export const CONSENT_ITEMS = [
  {
    id: "adult",
    required: true,
    text: "I am 18 years old or older.",
  },
  {
    id: "collect",
    required: true,
    text: "StyleCraft collects my answers, measurements and contact details to make my personal style report.",
  },
  {
    id: "photo",
    required: true,
    text: "If I use the face photo step, my photo is read on my own device and is never uploaded. If I later send an outfit photo for the free check, I will be asked again; it is stored privately and deleted after 7 days.",
  },
  {
    id: "ai",
    required: true,
    text: "Only anonymous details such as colours, sizes and budget (no name, phone number or photo) are sent to Google’s Gemini AI to help draft my report. While StyleCraft uses Google’s free tier, Google may use this content to improve its products.",
  },
  {
    id: "delete",
    required: true,
    text: "My name and any contact details are deleted 7 days after I use my report link. I can ask for earlier deletion at any time.",
  },
] as const;

export const KEEP_ANONYMOUS = {
  id: "keep_anonymous",
  required: false,
  text: "Optional: StyleCraft may keep my body details, colours, sizes and feedback, with no name or contact details and no way back to me, to improve the service.",
} as const;
