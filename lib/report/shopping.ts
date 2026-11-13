import type { Draft, ShopLine, Shopping } from "./types";

const labelCat = (c: string) => c.replace(/-/g, " ").replace(/^./, (x) => x.toUpperCase());
const core = (name: string, colour: string) =>
  name.toLowerCase().replace(colour.replace(/-/g, " ").toLowerCase(), "").replace(/\s+/g, " ").trim() || name.toLowerCase();

// Which pieces to buy first: the ones reused in the most outfits. Prices are the report's own estimates, never shop prices.
export function buildShopping(outfits: Draft["outfits"]): Shopping {
  const groups = new Map<string, ShopLine & { order: number; prices: number[]; seen: Set<number> }>();
  let order = 0;
  outfits.forEach((o, oi) => o.items.forEach((it) => {
    const key = `${it.category}|${core(it.name, it.colour)}|${it.colour}`;
    let g = groups.get(key);
    if (!g) { g = { name: it.name, colour: it.colour, category: it.category, price: 0, outfits: 0, order: order++, prices: [], seen: new Set() }; groups.set(key, g); }
    g.prices.push(it.pricePerPiece);
    if (!g.seen.has(oi)) { g.seen.add(oi); g.outfits += 1; }
  }));
  const lines: ShopLine[] = [...groups.values()]
    .sort((a, b) => b.outfits - a.outfits || a.order - b.order)
    .map((g) => ({ name: g.name, colour: g.colour, category: g.category, price: Math.round(g.prices.reduce((s, x) => s + x, 0) / g.prices.length / 50) * 50, outfits: g.outfits }));
  const buyFirst = lines.slice(0, 5);
  const optional = lines.slice(5);
  const sum = (l: ShopLine[]) => l.reduce((s, x) => s + x.price, 0);
  const totalAll = sum(lines);
  const byCat = new Map<string, number>();
  lines.forEach((l) => byCat.set(l.category, (byCat.get(l.category) ?? 0) + l.price));
  const split = [...byCat.entries()].map(([c, amount]) => ({ category: labelCat(c), amount, share: totalAll ? amount / totalAll : 0 })).sort((a, b) => b.amount - a.amount);
  return { buyFirst, optional, totalFirst: sum(buyFirst), totalAll, split, note: "These are estimates per piece from your budget band, not current shop prices. Prices change by shop and season." };
}
