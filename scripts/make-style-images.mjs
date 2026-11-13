// Makes the photos for the start form with Google's image model, using the key already in .env.local.
// Run once on your computer:   node scripts/make-style-images.mjs
// Only missing files are made, so you can run it again to fill gaps. Delete a file to make a new one.
// Optional: IMAGE_MODEL=<model name> in .env.local (default gemini-2.5-flash-image).
import fs from "node:fs";
import path from "node:path";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);
const KEY = env.GEMINI_API_KEY;
const MODEL = env.IMAGE_MODEL || "gemini-2.5-flash-image";
if (!KEY) { console.error("GEMINI_API_KEY is missing in .env.local"); process.exit(1); }

const WHO = {
  men: "an Indian man in his late 20s",
  women: "an Indian woman in her late 20s",
  unisex: "two young Indian people, one man and one woman, standing side by side, both dressed in the same style",
};
const STYLES = {
  "smart-casual": { men: "a fitted oxford shirt with tailored chinos and clean leather sneakers", women: "a crisp blouse with tailored trousers and loafers", unisex: "smart casual outfits: shirt, chinos or trousers, loafers" },
  classic: { men: "a navy blazer, white shirt and grey trousers with leather shoes", women: "a tailored blazer, silk shirt and straight trousers with classic heels", unisex: "timeless tailored outfits in navy, white and grey" },
  minimal: { men: "a plain white tee, beige trousers and white sneakers, clean monochrome look", women: "a plain neutral knit top, wide beige trousers and minimal flats, clean monochrome look", unisex: "minimal monochrome outfits in neutral tones" },
  street: { men: "an oversized hoodie, cargo pants and chunky sneakers", women: "an oversized hoodie, baggy jeans and chunky sneakers", unisex: "streetwear: hoodies, baggy denim and sneakers" },
  ethnic: { men: "a cream cotton kurta with a pyjama and juttis", women: "an elegant cotton kurta set with dupatta, or a handloom saree", unisex: "Indian ethnic wear: a kurta and a kurta set" },
  trendy: { men: "a current fashion-forward look: boxy printed shirt, pleated trousers, statement sneakers", women: "a current fashion-forward look: cropped jacket, wide-leg trousers, statement accessories", unisex: "fashion-forward trendy outfits" },
  sporty: { men: "a track jacket, joggers and running shoes", women: "a zip-up track jacket, leggings and running shoes", unisex: "athleisure: track jackets, joggers and running shoes" },
};
const FITS = {
  slim: "a slim, close-to-the-body fit",
  regular: "a regular, true-to-size comfortable fit",
  relaxed: "a relaxed, loose and airy fit",
  oversized: "an oversized, boxy, voluminous fit",
};
const COMMON = "Fashion lookbook photo, full body, standing, plain warm neutral studio background, soft natural light, realistic, high quality, no text, no logos, no watermark. Portrait orientation 4:5.";

const jobs = [];
for (const [id, v] of Object.entries(STYLES)) for (const g of Object.keys(WHO))
  jobs.push([`public/styles/${g}/${id}.jpg`, `${COMMON} ${WHO[g]} wearing ${v[g]}.`]);
for (const [id, d] of Object.entries(FITS)) for (const g of Object.keys(WHO))
  jobs.push([`public/fit/${g}/${id}.jpg`, `${COMMON} ${WHO[g]} wearing a plain shirt and trousers in ${d}.`]);
jobs.push(["public/who/menswear.jpg", `${COMMON} an Indian man in his late 20s in a smart casual outfit.`]);
jobs.push(["public/who/womenswear.jpg", `${COMMON} an Indian woman in her late 20s in a smart casual outfit.`]);
jobs.push(["public/who/mixed.jpg", `${COMMON} an Indian man and an Indian woman side by side in smart casual outfits.`]);

async function make(prompt) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"] } }),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const part = j.candidates?.[0]?.content?.parts?.find((x) => x.inlineData || x.inline_data);
  const d = part?.inlineData ?? part?.inline_data;
  if (!d?.data) throw new Error("no image in the reply");
  return Buffer.from(d.data, "base64");
}

let done = 0, failed = 0;
for (const [file, prompt] of jobs) {
  if (fs.existsSync(file)) { done++; continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    fs.writeFileSync(file, await make(prompt));
    done++; console.log(`made ${file}  (${done}/${jobs.length})`);
  } catch (e) {
    failed++; console.error(`FAILED ${file}: ${e.message}`);
    if (/429|quota/i.test(String(e.message))) {
      console.error("\nStopped: this Gemini key has no image-generation quota. On the free plan, image models have none.");
      console.error("Fix: turn on billing for the key's project at https://aistudio.google.com/apikey (36 images cost roughly 1 to 2 US dollars), then run  npm run images  again.");
      console.error("Or make the pictures in the free Gemini app or Google AI Studio and save them with the names in public/styles/README.txt.");
      break;
    }
    if (/403|401|API key|permission/i.test(String(e.message))) { console.error("Check the key and that image generation is available for it."); break; }
  }
  await new Promise((r) => setTimeout(r, 1500));
}
console.log(`Finished. ${done} ready, ${failed} failed.`);
