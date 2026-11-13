import type { ShopLine } from "./types";

// Search links only. They open each shop's own results page, so the price, photo and stock are always the shop's live ones.
// StyleCraft never copies prices or product photos from shop sites.
export const SHOPS = [
  { id: "myntra", name: "Myntra", url: (q: string) => `https://www.myntra.com/${encodeURIComponent(q.trim().replace(/\s+/g, "-"))}` },
  { id: "ajio", name: "Ajio", url: (q: string) => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}` },
  { id: "amazon", name: "Amazon", url: (q: string) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}` },
  { id: "flipkart", name: "Flipkart", url: (q: string) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}` },
] as const;

// "Navy chinos" + colour "navy" + menswear -> "navy chinos men". The colour is added only if the item name does not already say it.
export function searchQuery(line: Pick<ShopLine, "name" | "colour">, presentation?: string) {
  const name = line.name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const colour = line.colour.toLowerCase().replace(/-/g, " ");
  const who = presentation === "menswear" ? "men" : presentation === "womenswear" ? "women" : "";
  return [name.includes(colour.split(" ")[0]) ? "" : colour, name, who].filter(Boolean).join(" ");
}

export const shopLinks = (line: Pick<ShopLine, "name" | "colour">, presentation?: string) => {
  const q = searchQuery(line, presentation);
  return SHOPS.map((s) => ({ id: s.id, name: s.name, href: s.url(q) }));
};

// ---- Affiliate links (web report only) ----
// Amazon and most networks do not allow their links inside PDFs or ebooks, so the PDF always keeps the plain search links.
// Settings (all optional, set in Vercel):
//   AMAZON_ASSOCIATE_TAG        your Amazon Associates tracking id, e.g. stylecraft-21
//   AFFILIATE_MYNTRA_TEMPLATE   the redirect link your network gives you, with {url} where the shop address goes
//   AFFILIATE_AJIO_TEMPLATE, AFFILIATE_FLIPKART_TEMPLATE, AFFILIATE_AMAZON_TEMPLATE (use this instead of the tag if your network wraps Amazon too)
export function affiliateHref(shopId: string, url: string, env: Record<string, string | undefined> = process.env): { href: string; affiliate: boolean } {
  const tpl = env[`AFFILIATE_${shopId.toUpperCase()}_TEMPLATE`]?.trim();
  if (tpl && tpl.includes("{url}") && /^https:\/\//.test(tpl)) return { href: tpl.replace("{url}", encodeURIComponent(url)), affiliate: true };
  const tag = env.AMAZON_ASSOCIATE_TAG?.trim();
  if (shopId === "amazon" && tag && /^[a-z0-9-]{3,40}$/i.test(tag)) return { href: `${url}&tag=${encodeURIComponent(tag)}`, affiliate: true };
  return { href: url, affiliate: false };
}

export function affiliateStatus(env: Record<string, string | undefined> = process.env) {
  const on = SHOPS.filter((s) => affiliateHref(s.id, "https://x.test/?a=1", env).affiliate).map((s) => s.name);
  return { any: on.length > 0, amazon: on.includes("Amazon"), shops: on };
}
