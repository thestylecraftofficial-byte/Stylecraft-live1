// StyleCraft rules v2: the written guidance in every report (patterns, clothing types, fit checks,
// starting sizes, occasion add-ons). Pure functions, no AI. Every rule carries the guide it came from,
// or is marked as a house rule (a style judgement) so the stylist can review those first.
import type { Profile } from "../schema";
import { SOURCES, type Source } from "./sources";
import type { Limits } from "./engine";

export type Kind = "sourced" | "adapted" | "house";
export type GuideRule = { text: string; src: string[]; kind: Kind };
export type Pick = { name: string; why: string; src: string[] };

export type Guide = {
  patterns: { wear: GuideRule[]; mixing: GuideRule[]; avoid: GuideRule[] };
  clothing: { category: string; label: string; picks: Pick[] }[];
  fits: { garment: string; checks: GuideRule[]; mistakes: GuideRule[] }[];
  sizes: { garment: string; size: string | null; basis: string; note: string; draft: boolean }[];
  sizeSafety: GuideRule[];
  occasions: { id: string; title: string; intro: string; dos: GuideRule[]; avoid: GuideRule[]; colours: string[] }[];
  finishing: GuideRule[];
  sources: Source[];
};

// sourced = taken from the guide; adapted = the guide's idea applied to a similar garment; house = style judgement.
const S = (text: string, ...src: string[]): GuideRule => ({ text, src, kind: "sourced" });
const A = (text: string, ...src: string[]): GuideRule => ({ text, src, kind: "adapted" });
const H = (text: string): GuideRule => ({ text, src: [], kind: "house" });

const label = (s: string) => s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
const cmToIn = (cm: number) => cm / 2.54;

// ---------------------------------------------------------------- patterns
function patterns(p: Profile, limits: Limits): Guide["patterns"] {
  const mixing = [
    S("Sort prints into four families: checks, stripes, repeat prints and textures. Mixing across families works best.", "mix"),
    S("Give each pattern its own scale: one large, one medium, one small, and keep the smallest very small.", "mix"),
    S("Give each pattern its own strength: one faint, one conservative, at most one bold.", "mix"),
    S("Two patterns from the same family (stripe with stripe) need a clear difference in size or colour.", "mix"),
    S("Unsure? Add a solid piece to balance the outfit. Less is more.", "mix"),
    S("With two patterns already in the outfit, keep trousers, shoes and accessories plain.", "stripes"),
  ];
  const wear: GuideRule[] = [];
  const has = (s: string) => p.stylePrefs.includes(s as Profile["stylePrefs"][number]);
  if (has("minimal") || has("classic")) wear.push(H("Lead with solids and texture (oxford weave, linen, knit). Add a fine stripe or micro-check for variety."));
  if (has("smart-casual")) wear.push(H("Fine stripes, gingham or small checks on the shirt; keep trousers solid."));
  if (has("street") || has("trendy")) wear.push(H("Larger checks, graphic prints and colour-blocking suit your style. Keep the rest plain so one piece leads."));
  if (has("ethnic")) wear.push(H("Woven jacquards, small block prints and tone-on-tone embroidery. For festive looks, let one piece carry the zari or motif."));
  if (has("sporty")) wear.push(H("Colour blocks and contrast piping on solid performance fabrics; avoid busy prints on sporty pieces."));
  if (!wear.length) wear.push(H("Start with solids in your palette, then add one fine stripe or small check."));

  const avoid: GuideRule[] = [
    H("Keep prints in your skip colours away from your face; if you love one, wear it on bottoms or shoes."),
  ];
  if (p.occasions.some((o) => ["office", "interview", "formal"].includes(o)))
    avoid.push(H("For office, interview and formal days, skip large loud prints and very high-contrast stripes."));
  if (p.fitPreference === "oversized") avoid.push(H("Large prints on an oversized cut overwhelm the outfit. Pick one: the print or the volume."));
  if (limits.confidence === "low") avoid.push(H("Your undertone evidence is thin, so test any bold printed colour near your face in daylight before buying."));
  return { wear, mixing, avoid };
}

// ---------------------------------------------------------------- clothing types
// g: "m" or "w" keeps an item to menswear or womenswear customers (footwear and accessories are shared lists).
type Item = { name: string; why: string; occ?: string[]; sty?: string[]; src?: string[]; g?: "m" | "w" };
const CLOTHING: Record<Profile["categories"][number], { label: string; items: Item[] }> = {
  "western-men": {
    label: "Western wear · men",
    items: [
      { name: "Oxford or poplin shirt", why: "A plain shirt in a palette colour is the base of most outfits.", occ: ["office", "interview", "date", "formal"], sty: ["classic", "smart-casual", "minimal"] },
      { name: "Linen or cotton-linen shirt", why: "Breathable in India's warm weather and looks smart without an iron-sharp finish.", occ: ["everyday", "date", "parties"], sty: ["smart-casual", "minimal"] },
      { name: "Polo", why: "Easy and neat when a shirt feels too formal.", occ: ["everyday"], sty: ["sporty", "smart-casual"] },
      { name: "Plain tee in a heavier cotton", why: "A good fabric holds shape and works under layers.", occ: ["everyday", "parties"], sty: ["street", "minimal", "trendy"] },
      { name: "Chinos", why: "The most flexible bottom: dress them up or down.", occ: ["office", "everyday", "date"], sty: ["smart-casual", "classic"] },
      { name: "Dark straight or slim jeans", why: "Dark denim pairs with almost every top in your palette.", occ: ["everyday", "date", "parties"], sty: ["street", "smart-casual", "trendy"] },
      { name: "Tailored trousers", why: "Gives a sharp line for office, interviews and formal days.", occ: ["office", "interview", "formal"], sty: ["classic"] },
      { name: "Overshirt", why: "Adds a layer without the weight of a blazer.", occ: ["date", "parties", "everyday"], sty: ["smart-casual", "street"] },
      { name: "Unstructured blazer", why: "One blazer lifts a plain shirt and chinos for interviews, dinners and weddings.", occ: ["interview", "formal", "parties", "wedding-guest"], sty: ["classic", "smart-casual"] },
      { name: "Denim or bomber jacket", why: "A casual outer layer that adds shape to simple outfits.", occ: ["everyday", "parties"], sty: ["street", "trendy"] },
    ],
  },
  "western-women": {
    label: "Western wear · women",
    items: [
      { name: "Structured shirt or blouse", why: "A clean top in a palette colour works under blazers and with trousers.", occ: ["office", "interview", "formal"], sty: ["classic", "minimal"] },
      { name: "Fitted or relaxed knit top", why: "Simple, comfortable and easy to layer.", occ: ["everyday", "date"], sty: ["minimal", "smart-casual"] },
      { name: "Straight or wide-leg trousers", why: "Gives a long, clean line and goes with most tops.", occ: ["office", "everyday", "interview"], sty: ["classic", "minimal", "smart-casual"] },
      { name: "Well-fitting jeans", why: "The weekend base: pair with tops, shirts or a blazer.", occ: ["everyday", "date"], sty: ["street", "smart-casual", "trendy"] },
      { name: "Midi dress", why: "One piece, a full outfit: easy for dates, parties and daytime events.", occ: ["date", "parties", "wedding-guest", "festival"], sty: ["trendy", "classic"] },
      { name: "Co-ord set", why: "Matched top and bottom, so two pieces work as one outfit or separately.", occ: ["parties", "date", "everyday"], sty: ["trendy", "street"] },
      { name: "Blazer", why: "Turns simple pieces into an office or interview outfit.", occ: ["office", "interview", "formal"], sty: ["classic", "smart-casual"] },
      { name: "Midi skirt", why: "Light and comfortable in heat, and easy to dress up.", occ: ["everyday", "office", "date"], sty: ["minimal", "classic"] },
    ],
  },
  "ethnic-men": {
    label: "Ethnic wear · men",
    items: [
      { name: "Cotton or linen kurta", why: "Breathable cotton or linen suits daytime wear in the heat.", occ: ["everyday", "office", "festival"], sty: ["ethnic", "minimal"], src: ["baggy"] },
      { name: "Silk-blend kurta", why: "A little sheen for evenings and festivals without looking plastic.", occ: ["festival", "wedding-guest", "parties"], sty: ["ethnic", "classic"], src: ["baggy"] },
      { name: "Nehru or bandi jacket", why: "Adds structure over a kurta without looking overdressed.", occ: ["festival", "wedding-guest", "formal"], sty: ["ethnic", "classic"], src: ["diwali"] },
      { name: "Slim pyjama or churidar", why: "Slim bottoms keep a loose kurta from looking oversized.", occ: ["everyday", "festival", "wedding-guest"], sty: ["ethnic"], src: ["baggy"] },
      { name: "Sherwani", why: "For dressy evening events and receptions; worth renting before buying.", occ: ["wedding-guest", "formal"], sty: ["ethnic", "classic"], src: ["telugu"] },
    ],
  },
  "ethnic-women": {
    label: "Ethnic wear · women",
    items: [
      { name: "Cotton kurta set", why: "Comfortable, breathable and ready to wear for work or errands.", occ: ["everyday", "office"], sty: ["ethnic", "minimal"] },
      { name: "Anarkali or silk kurta set", why: "A festive look in one piece, with room to move.", occ: ["festival", "wedding-guest", "parties"], sty: ["ethnic", "classic"], src: ["diwali"] },
      { name: "Saree with a contrast blouse", why: "A deliberate contrast blouse lifts a plain saree; pick a shade that looks chosen, not nearly-matched.", occ: ["wedding-guest", "festival", "formal"], sty: ["ethnic", "classic"], src: ["blouse2"] },
      { name: "Straight pants or palazzo with a kurti", why: "Easy everyday ethnic wear that works with flats or sandals.", occ: ["everyday", "office"], sty: ["ethnic", "minimal", "smart-casual"] },
      { name: "Lehenga or sharara set", why: "For wedding functions where you want a full festive outfit.", occ: ["wedding-guest", "festival"], sty: ["ethnic", "trendy"], src: ["telugu"] },
      { name: "A dupatta in a lighter fabric", why: "A lighter dupatta drapes better over a heavier kurta and covers the shoulders at ceremonies.", occ: ["festival", "wedding-guest", "everyday"], sty: ["ethnic"], src: ["telugu"] },
    ],
  },
  footwear: {
    label: "Footwear",
    items: [
      { name: "Leather loafers or derbies", why: "One polished pair covers office, interviews and dinners.", occ: ["office", "interview", "formal", "date"], sty: ["classic", "smart-casual"] },
      { name: "Clean neutral sneakers", why: "The everyday pair: keep them clean and plain so they go with everything.", occ: ["everyday", "date"], sty: ["street", "minimal", "smart-casual", "sporty"] },
      { g: "m", name: "Formal lace-ups in black or brown", why: "Sharp for interviews, formal days and dressier evenings; keep them polished.", occ: ["interview", "formal", "office", "wedding-guest"], sty: ["classic"] },
      { g: "m", name: "Leather sandals or chappals", why: "Comfortable in the heat and easy with kurtas and casual shirts.", occ: ["everyday", "festival"], sty: ["ethnic", "minimal", "smart-casual"] },
      { name: "Kolhapuris or mojaris", why: "The natural pair for kurtas and festive wear, and comfortable for long events.", occ: ["festival", "wedding-guest", "everyday"], sty: ["ethnic"] },
      { g: "w", name: "Block heels or wedges", why: "Steady and comfortable for events where you walk and dance a lot.", occ: ["wedding-guest", "parties", "festival"], sty: ["ethnic", "classic", "trendy"], src: ["wedding"] },
      { g: "w", name: "Flat sandals", why: "Comfortable in the heat and easy with kurtis, dresses and trousers.", occ: ["everyday", "festival"], sty: ["minimal", "ethnic"] },
    ],
  },
  accessories: {
    label: "Accessories",
    items: [
      { name: "A watch with a leather or metal strap", why: "The one accessory that finishes almost every outfit.", occ: ["office", "interview", "date", "formal", "everyday"], sty: ["classic", "smart-casual", "minimal"] },
      { name: "A belt that matches your shoes", why: "Matching leather ties the lower half of the outfit together.", occ: ["office", "interview", "formal"], sty: ["classic", "smart-casual"] },
      { name: "Jewellery in your metal tone", why: "The right metal near the face supports your colours (see Finishing touches).", occ: ["festival", "wedding-guest", "parties", "date"], sty: ["ethnic", "classic", "trendy"] },
      { name: "A simple bag in a neutral colour", why: "One neutral bag works with your whole palette.", occ: ["everyday", "office"], sty: ["minimal", "classic"] },
    ],
  },
};

function clothing(p: Profile, limits: Limits): Guide["clothing"] {
  return limits.categories.map((cat) => {
    const def = CLOTHING[cat];
    const scored = def.items.filter((it) => !(it.g === "w" && p.presentation === "menswear") && !(it.g === "m" && p.presentation === "womenswear")).map((it) => {
      const o = (it.occ ?? []).filter((x) => p.occasions.includes(x as Profile["occasions"][number]));
      const s = (it.sty ?? []).filter((x) => p.stylePrefs.includes(x as Profile["stylePrefs"][number]));
      return { it, score: o.length * 2 + s.length, why: o.length ? `${it.why} Chosen for your ${label(o[0]).toLowerCase()} plans.` : it.why };
    });
    const picks = scored.sort((a, b) => b.score - a.score).slice(0, 5)
      .map((x) => ({ name: x.it.name, why: x.why, src: x.it.src ?? [] }));
    return { category: cat, label: def.label, picks };
  });
}

// ---------------------------------------------------------------- fit checks
function fits(p: Profile, limits: Limits): Guide["fits"] {
  const out: Guide["fits"] = [];
  const cats = limits.categories;
  if (cats.includes("western-men")) {
    out.push({
      garment: "Shirts (men)",
      checks: [
        S("Shoulder seam sits flat at the edge of your shoulder, with no pulling.", "shirt"),
        S("Buttoned, the shirt lies flat across the chest and has no extra fabric at the waist.", "shirt"),
        S("The cuff ends at the wrist bone.", "shirt"),
        S("The collar closes comfortably: you should fit two fingers between neck and collar.", "shirt"),
        S("It tucks in cleanly without pulling at the hem.", "shirt"),
      ],
      mistakes: [
        S("Sleeves too short look awkward; too long bunch up.", "shirt"),
        S("Spare fabric around the collarbone or waist.", "shirt"),
        S("A shirt that looks right under a jacket can look oversized without one.", "shirt"),
      ],
    });
    out.push({
      garment: "Trousers and chinos (men)",
      checks: [
        S("Waist: snug enough to hold a tucked shirt in place. If you can pinch more than an inch of spare fabric, it is too big.", "trouser"),
        S("Seat: you should sit comfortably, with a smooth line and no X-shaped wrinkles at the fly.", "trouser"),
        S("Rise: a tailor cannot change it, so check it before you buy.", "trouser"),
        S("Leg: if your calves show through, the leg is too tight. Jeans and chinos should taper slightly toward the bottom.", "trouser"),
        S("Length: no break to a slight break at the front. Check it with the shoes you will wear.", "trouser"),
      ],
      mistakes: [
        S("Fabric that tents or folds over itself means the rise is too big.", "trouser"),
        S("Trousers that cover much of the shoe throw off your proportions.", "trouser"),
        S("The whole ankle showing makes trousers look too short.", "trouser"),
      ],
    });
  }
  if (cats.includes("ethnic-men")) {
    out.push({
      garment: "Kurtas (men)",
      checks: [
        S("Shoulder seam sits at the edge of your shoulder bone. Inside it means too narrow; down the upper arm means too wide.", "kurta"),
        S("Regular fit adds about an inch to your chest measurement; slim stays close to it. Two fingers should slide between fabric and chest.", "kurta"),
        S("Sleeve ends around the wrist, without bunching.", "kurta", "baggy"),
        S("Length: mid-thigh to knee suits most heights. If unsure, choose knee length.", "kurta"),
        S("Pair a fitted kurta with a tapered trouser or churidar, and a looser kurta with a slim pyjama.", "baggy"),
      ],
      mistakes: [
        S("If the shoulder fits, a tailor can adjust the chest easily. So buy for the shoulder first.", "kurta"),
        S("Fabric that balloons around the torso means the size is wrong.", "baggy"),
        S("Saggy pyjamas, or casual cotton with silk pants, look mismatched.", "baggy"),
      ],
    });
  }
  if (cats.includes("western-women")) {
    out.push({
      garment: "Tops, dresses and trousers (women)",
      checks: [
        S("Shoulder seam sits at the edge of the shoulder, without drooping or pulling.", "kurti"),
        S("You can move your arms comfortably and the neckline stays in place without gaping.", "kurti"),
        S("Dresses: measure over the underwear you will wear, and check the hem with the shoes you will wear.", "dress"),
        S("Between two sizes, take the larger and have a tailor take it in; it is easier than letting out.", "dress"),
        A("Trousers: the waist should hold without digging in, and the hem should skim your shoes. The rise cannot be altered, so check it.", "trouser"),
      ],
      mistakes: [
        S("Assuming your size is the same in every brand: always check each brand's own chart.", "dress"),
        S("Buying a size by the label instead of your measurements.", "dress"),
      ],
    });
  }
  if (cats.includes("ethnic-women")) {
    out.push({
      garment: "Kurtis and kurta sets (women)",
      checks: [
        S("Choose by bust first, because the shoulders and chest decide how it drapes.", "kurti"),
        S("Shoulder seam at the edge of the shoulder; arms move freely.", "kurti"),
        S("For straight silhouettes, check the hips are comfortable.", "kurti"),
        S("Mid-calf to ankle length is the most versatile; knee length works with denim.", "kurti"),
        S("Between sizes, take the larger and tailor the waist.", "kurti"),
      ],
      mistakes: [
        S("Sleeves that feel restrictive: change the sleeve cut or the size.", "kurti"),
        S("A neckline that gapes when you bend.", "kurti"),
      ],
    });
    out.push({
      garment: "Saree blouses",
      checks: [
        S("Measure the bust at its fullest, snug but not tight, and add about an inch of ease.", "blouse2"),
        S("Measure while wearing the bra you will wear with the blouse.", "blouse1"),
        S("Armhole sits close without gaping or cutting in; you can raise your arms easily.", "blouse1", "blouse2"),
        S("No pulling or gaping at hooks or buttons, and the blouse does not shift when you sit or twist.", "blouse2"),
        S("Shoulder seam at the edge of the shoulder, and darts point to the fullest part of the bust.", "blouse2"),
        S("A contrast blouse should look deliberate; a nearly matching shade looks accidental.", "blouse2"),
      ],
      mistakes: [
        S("A tight armhole restricts movement and a loose one spoils the line.", "blouse1"),
        S("Stiff fabrics add volume and suit a close fit poorly; cotton blends and silk fit neatly.", "blouse1"),
      ],
    });
  }
  const style: GuideRule[] = [];
  if (p.fitPreference === "slim") style.push(S("Slim means close to your measurements with minimal extra fabric. Do not size down below your measurements.", "kurta"));
  if (p.fitPreference === "regular" || p.fitPreference === "not-sure") style.push(S("Regular fit adds about an inch of ease on the chest.", "kurta"));
  if (p.fitPreference === "relaxed") style.push(A("Relaxed fit: size up only after the shoulder fits, because a tailor cannot fix shoulders as easily as body width.", "kurta"));
  if (p.fitPreference === "oversized") style.push(H("Oversized should look planned: a dropped shoulder is meant, but the rest of the outfit stays more fitted."));
  if (style.length) out.push({ garment: `Your fit preference: ${label(p.fitPreference).toLowerCase()}`, checks: style, mistakes: [] });
  return out;
}

// ---------------------------------------------------------------- starting sizes
const LETTER_MEN = [{ max: 91, l: "S" }, { max: 99, l: "M" }, { max: 107, l: "L" }, { max: 115, l: "XL" }, { max: 125, l: "XXL" }];
const BUST_WOMEN = [{ max: 82, l: "XS" }, { max: 87, l: "S" }, { max: 92, l: "M" }, { max: 97, l: "L" }, { max: 102, l: "XL" }, { max: 107, l: "XXL" }];
const HIP_WOMEN = [{ max: 90, l: "XS" }, { max: 95, l: "S" }, { max: 100, l: "M" }, { max: 105, l: "L" }, { max: 110, l: "XL" }, { max: 115, l: "XXL" }];
const KURTA_CHART = [{ chest: 36, l: "S" }, { chest: 38, l: "M" }, { chest: 40, l: "L" }, { chest: 42, l: "XL" }, { chest: 44, l: "XXL" }];

const step = (steps: { max: number; l: string }[], v: number) => steps.find((s) => v <= s.max)?.l ?? "3XL or above";
const idx = (steps: { l: string }[], l: string) => steps.findIndex((s) => s.l === l);

function sizes(p: Profile, limits: Limits): { rows: Guide["sizes"]; safety: GuideRule[] } {
  const m = p.measurements;
  const val = (k: keyof Profile["measurements"]) => (m[k].unsure ? null : m[k].value);
  const chest = val("chest_or_bust"), waist = val("waist"), hips = val("hips"), inseam = val("inseam"), height = val("height");
  const rows: Guide["sizes"] = [];
  const cats = limits.categories;
  const missing = (what: string) => ({ size: null as string | null, basis: `Not enough information (${what} not given).`, note: "We do not guess a size without the measurement." });
  const brand = "A starting point only: check the brand's own size chart, because sizes vary between brands.";

  if (cats.includes("western-men")) {
    rows.push({ garment: "Shirts and tees", draft: false, ...(chest == null ? missing("chest") : { size: step(LETTER_MEN, chest), basis: `Chest ${chest} cm`, note: brand }) });
    rows.push({
      garment: "Trousers and chinos", draft: false,
      ...(waist == null ? missing("waist") : (() => {
        const inch = Math.ceil((cmToIn(waist) - 0.15) / 2) * 2;
        return { size: `${inch} in`, basis: `Waist ${waist} cm (about ${cmToIn(waist).toFixed(1)} in)`, note: "Between sizes, go up and have the waist taken in. " + brand };
      })()),
    });
  }
  if (cats.includes("ethnic-men")) {
    rows.push({
      garment: "Kurtas (men)", draft: false,
      ...(chest == null ? missing("chest") : (() => {
        const ease = p.fitPreference === "slim" ? 0.5 : p.fitPreference === "relaxed" || p.fitPreference === "oversized" ? 2 : 1;
        const target = cmToIn(chest) + ease;
        const hit = KURTA_CHART.find((k) => k.chest >= target - 0.01);
        return { size: hit ? hit.l : "XXL or above", basis: `Chest ${chest} cm plus ${ease} in of ease for a ${label(p.fitPreference === "not-sure" ? "regular" : p.fitPreference).toLowerCase()} fit`, note: "Kurta charts list the garment's chest. Between sizes, go up. " + brand };
      })()),
    });
  }
  const womenTop = cats.some((c) => c === "western-women" || c === "ethnic-women");
  if (womenTop) {
    const bustL = chest == null ? null : step(BUST_WOMEN, chest);
    const hipL = hips == null ? null : step(HIP_WOMEN, hips);
    if (cats.includes("ethnic-women") || cats.includes("western-women")) rows.push({ garment: "Tops, kurtis and blouses", draft: true, ...(bustL == null ? missing("bust") : { size: bustL, basis: `Bust ${chest} cm`, note: "Choose by bust first. " + brand }) });
    rows.push({ garment: "Bottoms and trousers", draft: true, ...(hipL == null ? missing("hips") : { size: hipL, basis: `Hips ${hips} cm`, note: "Choose by hips, then take in the waist if needed. " + brand }) });
    if (cats.includes("western-women")) {
      const both = bustL && hipL && !bustL.includes("3XL") && !hipL.includes("3XL") ? (idx(BUST_WOMEN, bustL) >= idx(HIP_WOMEN, hipL) ? bustL : hipL) : null;
      rows.push({ garment: "Dresses", draft: true, ...(both ? { size: both, basis: `Bust ${chest} cm, hips ${hips} cm: the larger of the two`, note: "Between sizes, take the larger and tailor it. " + brand } : missing("bust and hips")) });
    }
    if (bustL && hipL && !bustL.includes("3XL") && !hipL.includes("3XL") && Math.abs(idx(BUST_WOMEN, bustL) - idx(HIP_WOMEN, hipL)) >= 2)
      rows.push({ garment: "Note on your measurements", draft: true, size: null, basis: `Bust ${bustL}, hips ${hipL}`, note: "Your top and bottom sizes differ by two or more steps. Buy tops and bottoms in different sizes, or choose pieces that can be tailored." });
  }
  if (inseam != null && (cats.includes("western-men") || cats.includes("western-women") || cats.includes("ethnic-men")))
    rows.push({ garment: "Trouser length", draft: false, size: `${inseam} cm inseam`, basis: height != null ? `Height ${height} cm` : "Inseam you entered", note: "Aim for no break to a slight break at the front, checked with the shoes you will wear." });

  const safety: GuideRule[] = [
    S("Sizes vary between brands. Compare your measurements to each brand's own chart, and check the specific style.", "dress"),
    S("If you fall between two sizes, take the larger and have it tailored.", "dress", "kurti", "kurta"),
    S("A tailor can usually adjust chest, waist and sleeve length more easily than shoulders or rise, so buy for those first.", "kurta", "trouser"),
    H("Your size comes only from the measurements you entered. It is never taken from a photo."),
  ];
  return { rows, safety };
}

// ---------------------------------------------------------------- occasion add-ons
const WEDDING_COLOURS = ["maroon", "emerald", "teal", "mustard", "navy", "burgundy", "olive", "green", "terracotta", "camel", "rust", "purple"];
const FESTIVE_COLOURS = ["mustard", "orange", "green", "emerald", "maroon", "pink", "royal-blue", "blue", "terracotta", "rust", "burgundy", "teal"];

function occasions(p: Profile, limits: Limits): Guide["occasions"] {
  const out: Guide["occasions"] = [];
  const women = limits.categories.some((c) => c.endsWith("women")) && p.presentation !== "menswear";
  const men = limits.categories.some((c) => c.endsWith("men") && !c.endsWith("women")) && p.presentation !== "womenswear";
  const pickFrom = (list: string[]) => limits.wearColours.filter((c) => list.includes(c)).slice(0, 5);

  if (p.occasions.includes("wedding-guest")) {
    const dos: GuideRule[] = [
      S("Wear Indian clothing where you can; keep any western outfit modest, especially at religious events.", "wedding"),
      S("Choose comfortable shoes: you will walk and dance a lot. Wedges and block heels are easier than thin heels.", "wedding"),
      S("Day functions suit brighter colours (green for mehendi, yellow and orange for haldi); evening functions suit sparkle.", "wedding"),
    ];
    if (women) dos.push(S("Cover your shoulders for the main ceremony and carry a dupatta or scarf.", "telugu"), S("For a Telugu ceremony, a pattu or Kanjivaram saree is the classic choice; a silk salwar suit or lehenga is a comfortable alternative.", "telugu"));
    if (men) dos.push(S("For a Telugu ceremony, a cream and gold kurta with a dhoti is the classic look; a silk kurta works for elegance and a sherwani for a dressy reception.", "telugu"), S("Many rituals involve sitting on the floor, so pick a cut and fabric you can move in.", "telugu"));
    out.push({
      id: "wedding-guest", title: "Wedding guest", intro: "What to wear, and what to leave out, when you are a guest at a wedding.",
      dos,
      avoid: [
        S("Avoid red: it is the bride's colour.", "wedding"),
        S("Avoid white and black at religious events; in many South Indian households all-white signals mourning and all-black is seen as inauspicious.", "wedding", "telugu"),
        S("Cocktail or evening receptions are the exception: black is usually fine there.", "wedding"),
      ],
      colours: pickFrom(WEDDING_COLOURS),
    });
  }
  if (p.occasions.includes("festival")) {
    const dos: GuideRule[] = [
      S("Colours carry meaning: gold and yellow for prosperity, green for new beginnings, pink for joy, blue for depth, orange for purity.", "diwali"),
      S("For daytime pooja, choose lighter fabrics and softer colours like mustard, pastel pink or sage; silk (Banarasi, Kanjivaram, Chanderi) is the most traditional choice.", "diwali"),
      S("For evenings, add richer fabrics like velvet or brocade, and carry a dupatta, shawl or Nehru jacket for cooler air.", "diwali"),
      S("With a heavily embroidered outfit, keep the jewellery minimal.", "diwali"),
    ];
    if (men) dos.push(S("A kurta-pyjama in a jewel tone is the most versatile; add a Nehru jacket for structure without overdressing.", "diwali"));
    if (women) dos.push(S("Sarees, Anarkali suits and salwar sets are traditional; palazzo suits with a festive kurti are an easier fusion.", "diwali"));
    out.push({
      id: "festival", title: "Festival", intro: "Dressing for pooja, family visits and festive evenings.",
      dos,
      avoid: [
        S("Black was once considered inauspicious for festivals; today it is accepted for evening parties, especially with gold, but not for pooja.", "diwali"),
        S("Avoid stiff synthetics in heat: choose breathable cotton-silk or linen for the day.", "baggy", "diwali"),
      ],
      colours: pickFrom(FESTIVE_COLOURS),
    });
  }
  return out;
}

// ---------------------------------------------------------------- finishing touches
function finishing(p: Profile, limits: Limits): GuideRule[] {
  const u = limits.undertone;
  const rules: GuideRule[] = [];
  const metal = u === "warm" ? "gold, brass and copper tones" : u === "cool" ? "silver, white gold and steel" : "either gold or silver, so choose by the outfit";
  rules.push(H(`Jewellery and watch metal: ${metal}.`));
  rules.push(H(u === "warm" ? "Leather straps: tan or brown. Shoes and belts: brown, tan or oxblood often look better than stark black." : u === "cool" ? "Leather straps: black or dark brown. Shoes and belts: black, grey or navy often look better than orange-tan." : "Leather straps and shoes: black and brown both work for you."));
  if (p.presentation !== "menswear") {
    rules.push(H(u === "warm" ? "Makeup basics: lip and blush in peach, coral or brick; a warm brown for eyes." : u === "cool" ? "Makeup basics: lip and blush in rose, berry or plum; a soft grey or cool brown for eyes." : "Makeup basics: lip and blush in rose-peach or soft brick sit between warm and cool; test in daylight."));
  }
  rules.push(S("Undertone is a self-check, not a verdict. Test colours in daylight under your chin; if you cannot see a clear difference, that is a valid result.", "colour"));
  return rules;
}

// ---------------------------------------------------------------- entry point
export function buildGuide(p: Profile, limits: Limits): Guide {
  const sz = sizes(p, limits);
  const g = {
    patterns: patterns(p, limits),
    clothing: clothing(p, limits),
    fits: fits(p, limits),
    sizes: sz.rows,
    sizeSafety: sz.safety,
    occasions: occasions(p, limits),
    finishing: finishing(p, limits),
  };
  const used = new Set<string>();
  const scan = (r: GuideRule[]) => r.forEach((x) => x.src.forEach((s) => used.add(s)));
  scan(g.patterns.wear); scan(g.patterns.mixing); scan(g.patterns.avoid); scan(g.sizeSafety); scan(g.finishing);
  g.fits.forEach((f) => { scan(f.checks); scan(f.mistakes); });
  g.occasions.forEach((o) => { scan(o.dos); scan(o.avoid); });
  g.clothing.forEach((c) => c.picks.forEach((x) => x.src.forEach((s) => used.add(s))));
  return { ...g, sources: Object.values(SOURCES).filter((s) => used.has(s.id)) };
}
