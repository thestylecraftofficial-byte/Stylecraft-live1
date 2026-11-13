import type { Profile } from "../schema";
import type { Limits } from "../rules/engine";
import { draftSchema, type Draft } from "../report/types";

export const PROMPT_VERSION = "p2";
export const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Each Gemini model has its own free-tier limit. When the main one is busy, a lighter model of the same family takes over.
export const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.5-flash-lite";

// Data minimisation: only anonymous, structured facts. No name, phone, email, photo or raw measurements.
export function buildPrompt(p: Profile, limits: Limits): { system: string; user: string } {
  const system = [
    "You are a personal stylist for Indian customers. Return ONLY valid JSON matching the requested shape.",
    "Hard limits (never break them): use only colours from wearColours; never use a colour in avoidColours; stay at or under maxPricePerPiece (Indian rupees); use only the listed categories.",
    "Never name shops or brands, never include links, and never state a current price: prices are rough estimates in rupees. For wedding-guest outfits never use red, white or black.",
    "Reuse a few core pieces across outfits so the customer can buy fewer things. Write short, plain-English text. Do not mention that you are an AI.",
  ].join(" ");
  const user = JSON.stringify({
    task: "Draft a style report: styleDna {name, summary, tips[3 short habits]}; 4-6 outfits each {name, occasion, why (one sentence on why it suits this customer), swap (one lower-cost swap), items[{name, colour, category, pricePerPiece, fit}]}; 3-6 dontBuy [{item, reason}]; a 4-week plan [{week, focus, action}].",
    customer: { ageRange: p.ageRange, styledFor: p.presentation, occasions: p.occasions, stylePrefs: p.stylePrefs, likedColours: p.likedColours, fitPreference: p.fitPreference },
    limits: {
      wearColours: limits.wearColours, avoidColours: limits.avoidColours, maxPricePerPiece: Number.isFinite(limits.maxPricePerPiece) ? limits.maxPricePerPiece : 12000,
      categories: limits.categories, fitNotes: limits.fit.notes,
    },
  });
  return { system, user };
}

type Fetch = typeof fetch;

export type DraftResult = { draft: Draft | null; /** true when trying again later could work (busy, timeout, odd reply); false when it never will (no key, bad key, model not found) */ retryable: boolean; error?: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- Guards against burning the free quota. Every failed call still counts, so we never repeat a call that cannot work.
const deadModels = new Set<string>();           // models that answered 404 (retired or misspelt): never asked again by this server
let coolUntil = 0;                              // after a 429 or a 5xx burst, no calls at all until this time
let stopUntil = 0;                              // after a key/model problem, no calls at all until this time
let noThinkingCfg = false; // set once if the API rejects the thinking setting
let discovered: { at: number; models: string[] } | null = null;

const versionOf = (name: string) => Number((/gemini-(\d+(?:\.\d+)?)/.exec(name) ?? [])[1] ?? 0);

// Asks Google which models this key can really use, so a retired model name fixes itself. One list call, cached for an hour.
async function discoverModels(apiKey: string, f: Fetch): Promise<string[]> {
  if (discovered && Date.now() - discovered.at < 3600_000) return discovered.models;
  try {
    const res = await f("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": apiKey }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const j = await res.json();
    const all: string[] = (j.models ?? [])
      .filter((m: { name?: string; supportedGenerationMethods?: string[] }) => m.name && (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m: { name: string }) => m.name.replace(/^models\//, ""))
      .filter((n: string) => /^gemini-[\d.]+-flash(-lite)?(-\d+)?$/.test(n)); // stable text models only: no preview, image, audio or live variants
    const full = all.filter((n) => !n.includes("lite")).sort((x, y) => versionOf(y) - versionOf(x));
    const lite = all.filter((n) => n.includes("lite")).sort((x, y) => versionOf(y) - versionOf(x));
    const models = [...full.slice(0, 1), ...lite.slice(0, 1)];
    discovered = { at: Date.now(), models };
    return models;
  } catch { return []; }
}

const note = async (res: Response) => { try { return ((await res.json())?.error?.message ?? "").toString().slice(0, 160); } catch { return ""; } };

// Calls Gemini a few times at most. Only busy or odd-reply failures are retried; a wrong key or a missing model is reported at once.
export async function generateDraftEx(p: Profile, limits: Limits, opts: { apiKey?: string; model?: string; fetchImpl?: Fetch; timeoutMs?: number; pauseMs?: number } = {}): Promise<DraftResult> {
  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) return { draft: null, retryable: false, error: "no key" };
  const f = opts.fetchImpl ?? fetch;
  const guarded = !opts.fetchImpl; // the guards below are for the live API, not for tests
  if (guarded && Date.now() < stopUntil) return { draft: null, retryable: false, error: "paused after a key or model error" };
  if (guarded && Date.now() < coolUntil) return { draft: null, retryable: true, error: "cooling down after a busy reply" };

  let models = opts.model ? [opts.model] : [DEFAULT_MODEL, ...(FALLBACK_MODEL && FALLBACK_MODEL !== DEFAULT_MODEL ? [FALLBACK_MODEL] : [])];
  models = models.filter((m) => !deadModels.has(m));
  let triedDiscovery = false;
  const deadline = Date.now() + (opts.timeoutMs ? opts.timeoutMs * 4 : 45_000); // one request must finish inside the host's 60 s limit
  if (!models.length && guarded && !opts.model) { triedDiscovery = true; models = (await discoverModels(apiKey, f)).filter((m) => !deadModels.has(m)); }
  const { system, user } = buildPrompt(p, limits);
  let calls = 0, busy = false, lastError = "";

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    for (let attempt = 0; attempt < 2; attempt++) {
      if (calls >= 4) break;
      const left = deadline - Date.now();
      if (left < 4000) break;
      calls++;
      try {
        const res = await f(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.7, ...(guarded && !noThinkingCfg ? { thinkingConfig: { thinkingLevel: "low" } } : {}) },
          }),
          signal: AbortSignal.timeout(Math.min(opts.timeoutMs ?? 25000, left)),
        });
        if (!res.ok) {
          const msg = await note(res);
          lastError = `${model} ${res.status} ${msg}`;
          console.error("gemini:", lastError);
          if (res.status === 400 && guarded && !noThinkingCfg && /thinking/i.test(msg)) { noThinkingCfg = true; calls--; continue; } // this model does not take the speed setting: ask again without it
          if (res.status === 404) {                          // model name is wrong or retired
            if (guarded) deadModels.add(model);
            if (guarded && !triedDiscovery && !opts.model) {
              triedDiscovery = true;
              const found = (await discoverModels(apiKey, f)).filter((m) => !deadModels.has(m) && !models.includes(m));
              models.push(...found);
            }
            break;                                           // next model, never the same one again
          }
          if (res.status === 429 || res.status >= 500) {     // busy or out of quota: do not repeat, try the other model once
            busy = true;
            if (res.status === 429 && models.length === 1 && attempt === 0) { await wait(opts.pauseMs ?? 1500); continue; }
            break;
          }
          if (guarded) stopUntil = Date.now() + 5 * 60_000;  // 400, 401, 403: the request or key is wrong, so repeating is pointless
          return { draft: null, retryable: false, error: lastError };
        }
        const json = await res.json();
        const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) { lastError = `${model} empty reply`; continue; }
        const parsed = draftSchema.safeParse(JSON.parse(text));
        if (parsed.success) return { draft: parsed.data, retryable: false };
        lastError = `${model} reply did not match the shape`;
      } catch (e) {
        lastError = `${model} ${e instanceof Error ? e.name : "error"}`;
        if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) { busy = true; break; } // too slow: the next model, not the same one again
      }
    }
  }
  if (guarded && busy) coolUntil = Date.now() + 60_000;
  const allDead = models.length > 0 ? models.every((m) => deadModels.has(m)) : true;
  if (guarded && allDead && !busy) stopUntil = Date.now() + 5 * 60_000;
  return { draft: null, retryable: !allDead || busy, error: lastError || "no usable model" };
}

// Returns a validated draft, or null on any failure. The caller falls back to the template.
export async function generateDraft(p: Profile, limits: Limits, opts: Parameters<typeof generateDraftEx>[2] = {}): Promise<Draft | null> {
  return (await generateDraftEx(p, limits, opts)).draft;
}
