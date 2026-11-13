// The downloadable report, made from the same Report object as the web page (one canonical report).
// Design follows the StyleCraft V4 report: cream paper, black and gold, Playfair Display + Manrope.
// Fonts come from the @fontsource packages; if they cannot be read, the built-in PDF fonts are used.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { shopLinks } from "./shoplinks";
import type { Report, Swatch } from "./types";
import type { GuideRule } from "../rules/guide";
import { hexFor, useFor, shadesFor, SHADE_NOTE } from "./colours";
import { reportDate, reportId } from "./meta";

const W = 595, H = 842, M = 48, TOP = H - 96, BOTTOM = 62;
const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
type C = ReturnType<typeof rgb>;
const PAPER = hex("#F8F4EB"), CARD = hex("#FFFFFF"), LINE = hex("#E7DDC9"), GOLD = hex("#B8963E"), GOLDL = hex("#D4B66A"), BLACK = hex("#141414");
const INK = hex("#1D1B19"), BODY = hex("#4A4640"), MUTE = hex("#8A8478"), SAND = hex("#F0E8D6"), REDBG = hex("#FBEDEA"), RED = hex("#B5483A"), CREAMTXT = hex("#E9E2D2");
const cap = (s: string) => s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
const money = (n: number) => "₹" + n.toLocaleString("en-IN");

type Fonts = { serif: PDFFont; serifB: PDFFont; sans: PDFFont; bold: PDFFont; rup: Map<PDFFont, PDFFont>; custom: boolean };
const FONT_DIR = (pkg: string) => path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files");

async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  try {
    const fontkit = (await import("@pdf-lib/fontkit")).default;
    doc.registerFontkit(fontkit);
    const f = async (pkg: string, file: string) => doc.embedFont(await readFile(path.join(FONT_DIR(pkg), file)), { subset: true });
    const [serif, serifB, sans, bold, rs, rb, rsn, rbn] = await Promise.all([
      f("playfair-display", "playfair-display-latin-600-normal.woff"), f("playfair-display", "playfair-display-latin-700-normal.woff"),
      f("manrope", "manrope-latin-500-normal.woff"), f("manrope", "manrope-latin-700-normal.woff"),
      f("playfair-display", "playfair-display-latin-ext-600-normal.woff"), f("playfair-display", "playfair-display-latin-ext-700-normal.woff"),
      f("manrope", "manrope-latin-ext-500-normal.woff"), f("manrope", "manrope-latin-ext-700-normal.woff"),
    ]);
    return { serif, serifB, sans, bold, rup: new Map([[serif, rs], [serifB, rb], [sans, rsn], [bold, rbn]]), custom: true };
  } catch {
    const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
    const sans = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    return { serif, serifB: serif, sans, bold, rup: new Map(), custom: false };
  }
}

// Text the fonts cannot draw is replaced. The rupee sign sits in a separate font file, so it is drawn as its own segment.
const plain = (s: string, custom: boolean) => {
  let t = s.replace(/◈/g, "*").replace(/[✓→✕]/g, "").replace(/ /g, " ");
  if (!custom) t = t.replace(/₹/g, "Rs. ").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/·/g, "-").replace(/[^\x20-\x7E]/g, "");
  return t;
};

async function loadLogo(doc: PDFDocument, name: string) {
  try { return await doc.embedPng(await readFile(path.join(process.cwd(), "public", name))); } catch { return null; }
}

export type PdfOptions = { token?: string; preparedFor?: string | null };

export async function renderPdf(r: Report, opts: PdfOptions = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Your StyleCraft personal style report");
  doc.setProducer("StyleCraft"); doc.setAuthor("StyleCraft");
  const F = await loadFonts(doc);
  const g = r.guide;
  const srcNo = new Map((g?.sources ?? []).map((s, i) => [s.id, i + 1] as const));
  const who = opts.preparedFor?.trim() || null;
  const rid = reportId(r, opts.token ?? "xxxxx");

  const kinds: ("cover" | "page" | "dark")[] = [];
  let page: PDFPage; let y = TOP; let curEyebrow = ""; let curTitle = "";

  // ---------------------------------------------------------------- text helpers
  const segs = (text: string, font: PDFFont) => {
    const t = plain(text, F.custom);
    const rf = F.rup.get(font);
    if (!F.custom || !rf || !t.includes("₹")) return [{ s: t, f: font }];
    return t.split(/(₹)/).filter(Boolean).map((s) => ({ s, f: s === "₹" ? rf : font }));
  };
  const tw = (text: string, font: PDFFont, size: number) => segs(text, font).reduce((a, x) => a + x.f.widthOfTextAtSize(x.s, size), 0);
  const draw = (text: string, x: number, yy: number, size: number, font: PDFFont, color: C = BODY, pg: PDFPage = page) => {
    let cx = x;
    for (const sg of segs(text, font)) { pg.drawText(sg.s, { x: cx, y: yy, size, font: sg.f, color }); cx += sg.f.widthOfTextAtSize(sg.s, size); }
  };
  const spacedW = (text: string, size: number, font: PDFFont, sp: number) => [...text].reduce((a, ch) => a + tw(ch, font, size) + sp, 0) - sp;
  const drawSpaced = (text: string, x: number, yy: number, size: number, font: PDFFont, color: C, sp: number, pg: PDFPage = page) => {
    let cx = x;
    for (const ch of [...text]) { draw(ch, cx, yy, size, font, color, pg); cx += tw(ch, font, size) + sp; }
  };
  const centered = (text: string, cx: number, yy: number, size: number, font: PDFFont, color: C, sp = 0, pg: PDFPage = page) => {
    const w = sp ? spacedW(text, size, font, sp) : tw(text, font, size);
    if (sp) drawSpaced(text, cx - w / 2, yy, size, font, color, sp, pg); else draw(text, cx - w / 2, yy, size, font, color, pg);
  };
  const wrap = (text: string, font: PDFFont, size: number, width: number) => {
    const out: string[] = []; let line = "";
    for (const w of plain(text, F.custom).split(/\s+/).filter(Boolean)) {
      const t = line ? line + " " + w : w;
      if (tw(t, font, size) > width && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  };
  // yTop is the top edge; drawSvgPath uses a y-down path anchored at (x, yTop).
  const rr = (x: number, yTop: number, w: number, h: number, rad: number, fill?: C, border?: C, pg: PDFPage = page) => {
    const p = `M ${rad} 0 H ${w - rad} Q ${w} 0 ${w} ${rad} V ${h - rad} Q ${w} ${h} ${w - rad} ${h} H ${rad} Q 0 ${h} 0 ${h - rad} V ${rad} Q 0 0 ${rad} 0 Z`;
    pg.drawSvgPath(p, { x, y: yTop, color: fill, borderColor: border, borderWidth: border ? 0.8 : 0 });
  };

  // ---------------------------------------------------------------- page flow
  const bg = (c: C) => page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: c });
  const newPage = (eyebrow: string, title: string, cont = false) => {
    page = doc.addPage([W, H]); bg(PAPER); kinds.push("page");
    curEyebrow = eyebrow; curTitle = title;
    drawSpaced(eyebrow.toUpperCase(), M, H - 52, 7.4, F.bold, GOLD, 2.6);
    if (cont) { draw(`${title} (continued)`, M, H - 78, 15, F.serif, INK); y = H - 100; }
    else {
      const lines = wrap(title, F.serif, 25, W - 2 * M);
      let ty = H - 82; lines.forEach((l) => { draw(l, M, ty, 25, F.serif, INK); ty -= 28; });
      page.drawRectangle({ x: M, y: ty + 12, width: 44, height: 1.5, color: GOLDL });
      y = ty - 14;
    }
  };
  const ensure = (need: number) => { if (y - need < BOTTOM) newPage(curEyebrow, curTitle, true); };

  const para = (text: string, o: { size?: number; font?: PDFFont; color?: C; indent?: number; gap?: number; width?: number; lh?: number } = {}) => {
    const size = o.size ?? 10.2, font = o.font ?? F.sans, indent = o.indent ?? 0, lh = o.lh ?? size * 1.55;
    for (const l of wrap(text, font, size, (o.width ?? W - 2 * M) - indent)) { ensure(lh); y -= lh; draw(l, M + indent, y + size * 0.25, size, font, o.color ?? BODY); }
    y -= o.gap ?? 4;
  };
  const lede = (t: string) => para(t, { size: 11.4, color: INK, gap: 8 });
  const h4 = (t: string) => { ensure(40); y -= 24; draw(t, M, y, 13.5, F.serif, INK); y -= 6; };
  const sub = (t: string) => { ensure(60); y -= 14; drawSpaced(t.toUpperCase(), M, y, 7, F.bold, MUTE, 1.4); y -= 2; };
  const tagOf = (ru: GuideRule) => (ru.src.length ? " " + ru.src.map((s) => `[${srcNo.get(s)}]`).join("") : " (house rule)");
  const bullets = (rules: (GuideRule | string)[], no = false) => {
    for (const ru of rules) {
      const text = typeof ru === "string" ? ru : ru.text + tagOf(ru);
      const lines = wrap(text, F.sans, 9.8, W - 2 * M - 20);
      ensure(lines.length * 14.5 + 8); y -= 4;
      if (no) { page.drawLine({ start: { x: M + 1, y: y - 6 }, end: { x: M + 6, y: y - 11 }, thickness: 1, color: RED }); page.drawLine({ start: { x: M + 6, y: y - 6 }, end: { x: M + 1, y: y - 11 }, thickness: 1, color: RED }); }
      else page.drawSvgPath("M 0 -3.2 L 3.2 0 L 0 3.2 L -3.2 0 Z", { x: M + 3.5, y: y - 8.5, color: GOLD });
      lines.forEach((l) => { y -= 14.5; draw(l, M + 18, y + 3, 9.8, F.sans, BODY); });
    }
    y -= 4;
  };
  const roundSwatches = (list: Swatch[]) => {
    const per = 5, cw = (W - 2 * M) / per;
    for (let i = 0; i < list.length; i += per) {
      ensure(165); y -= 8;
      list.slice(i, i + per).forEach((c, k) => {
        const cx = M + k * cw + cw / 2;
        page.drawCircle({ x: cx, y: y - 30, size: 31, color: hex("#FFFFFF"), borderColor: LINE, borderWidth: 0.8 });
        page.drawCircle({ x: cx, y: y - 30, size: 28.5, color: hex(c.hex) });
        centered(c.name, cx, y - 76, 8.8, F.bold, INK);
        const use = wrap(useFor(c.name), F.sans, 7.2, cw - 14);
        use.slice(0, 2).forEach((l, n) => centered(l, cx, y - 87 - n * 9, 7.2, F.sans, MUTE));
        if (c.why) wrap(c.why, F.sans, 6.6, cw - 10).slice(0, 2).forEach((l, n) => centered(l, cx, y - 104 - n * 8, 6.6, F.bold, hex("#B8963E")));
        shadesFor(c.name).forEach((sh, n) => {
          const sy = y - 122 - n * 10; const w = tw(sh.name, F.sans, 6.8);
          page.drawCircle({ x: cx - w / 2 - 6, y: sy + 2.2, size: 3, color: hex(sh.hex), borderColor: LINE, borderWidth: 0.4 });
          draw(sh.name, cx - w / 2 + 1, sy, 6.8, F.sans, INK);
        });
      });
      y -= 156;
    }
  };
  const strip = (list: Swatch[], x: number, yTop: number, w: number, h: number) => {
    const cw = w / list.length;
    list.forEach((c, i) => page.drawRectangle({ x: x + i * cw, y: yTop - h, width: cw, height: h, color: hex(c.hex) }));
    page.drawRectangle({ x, y: yTop - h, width: w, height: h, borderColor: LINE, borderWidth: 0.8 });
  };
  const kvCards = (items: [string, string][]) => {
    const cw = (W - 2 * M - 10) / 2;
    for (let i = 0; i < items.length; i += 2) {
      const pair = items.slice(i, i + 2);
      const lines = pair.map(([, v]) => wrap(v, F.serif, 11, cw - 36));
      const h = 30 + Math.max(...lines.map((l) => l.length)) * 14;
      ensure(h + 8); y -= 4;
      pair.forEach(([k, ], n) => {
        const x = M + n * (cw + 10);
        rr(x, y, cw, h, 7, CARD, LINE);
        page.drawSvgPath("M 0 -2.6 L 2.6 0 L 0 2.6 L -2.6 0 Z", { x: x + 13, y: y - 14, color: GOLD });
        drawSpaced(k.toUpperCase(), x + 22, y - 16, 6.8, F.bold, GOLD, 1.5);
        lines[n].forEach((l, m) => draw(l, x + 22, y - 31 - m * 14, 11, F.serif, INK));
      });
      y -= h + 6;
    }
  };
  const blackBar = (title: string, tag?: string) => {
    ensure(54); y -= 8;
    page.drawRectangle({ x: M, y: y - 24, width: W - 2 * M, height: 24, color: BLACK });
    draw(title, M + 12, y - 16, 11.5, F.serif, GOLDL);
    if (tag) { const t = tag.toUpperCase(); drawSpaced(t, W - M - 12 - spacedW(t, 6.8, F.bold, 1.4), y - 15, 6.8, F.bold, hex("#C9BFA6"), 1.4); }
    page.drawRectangle({ x: M, y: y - 30, width: W - 2 * M, height: 6, color: SAND });
    y -= 34;
  };
  const table = (head: string[], rows: string[][], widths: number[], o: { big?: number; goldCol?: number } = {}) => {
    const total = W - 2 * M; const cols = widths.map((w) => w * total);
    ensure(60); y -= 4;
    page.drawRectangle({ x: M, y: y - 22, width: total, height: 22, color: BLACK });
    let hx = M + 10; head.forEach((hd, i) => { drawSpaced(hd.toUpperCase(), hx, y - 14.5, 6.8, F.bold, GOLDL, 1.4); hx += cols[i]; });
    y -= 22;
    for (const row of rows) {
      const cells = row.map((c, i) => wrap(c, i === o.big ? F.serif : F.sans, i === o.big ? 14 : 9, cols[i] - 16));
      const n = Math.max(...cells.map((c) => c.length));
      const rowH = Math.max(n * 12.5, o.big != null ? 18 : 0) + 16;
      ensure(rowH);
      page.drawRectangle({ x: M, y: y - rowH, width: total, height: rowH, color: CARD, borderColor: LINE, borderWidth: 0.4 });
      let cx = M + 10;
      cells.forEach((lines, i) => {
        lines.forEach((l, k) => draw(l, cx, y - 16 - k * (i === o.big ? 16 : 12.5), i === o.big ? 14 : 9, i === o.big ? F.serif : i === 0 || i === o.goldCol ? F.bold : F.sans, i === o.goldCol ? GOLD : i === 0 || i === o.big ? INK : BODY));
        cx += cols[i];
      });
      y -= rowH;
    }
    y -= 8;
  };
  const card = (title: string, lines: string[], tint?: C) => {
    const body = lines.flatMap((l) => wrap(l, F.sans, 9.6, W - 2 * M - 32));
    const h = 30 + body.length * 13.5 + 8;
    ensure(h + 8); y -= 6;
    rr(M, y, W - 2 * M, h, 9, tint ?? CARD, LINE);
    draw(title, M + 16, y - 21, 12.5, F.serif, INK);
    body.forEach((l, k) => draw(l, M + 16, y - 38 - k * 13.5, 9.6, F.sans, BODY));
    y -= h + 2;
  };

  // ================================================================ cover
  page = doc.addPage([W, H]); bg(PAPER); kinds.push("cover");
  page.drawRectangle({ x: 20, y: 20, width: W - 40, height: H - 40, borderColor: GOLDL, borderWidth: 1.6 });
  page.drawRectangle({ x: 27, y: 27, width: W - 54, height: H - 54, borderColor: GOLDL, borderWidth: 0.5 });
  const cx0 = W / 2;
  const logo = await loadLogo(doc, "logo.png");
  if (logo) { const lw0 = 250, lh0 = lw0 * logo.height / logo.width; page.drawImage(logo, { x: cx0 - lw0 / 2, y: 520 - 0, width: lw0, height: lh0 }); }
  else { draw("S", cx0 - 40, H - 200, 96, F.serifB, GOLD); draw("C", cx0 - 6, H - 188, 84, F.serifB, BLACK); centered("STYLECRAFT", cx0, H - 236, 15, F.serif, INK, 6); }
  const lab = "CONFIDENTIAL PERSONAL STYLE ANALYSIS"; const lw = spacedW(lab, 7, F.bold, 3) + 40;
  page.drawRectangle({ x: cx0 - lw / 2, y: 470, width: lw, height: 24, color: BLACK }); centered(lab, cx0, 478.5, 7, F.bold, hex("#FFFFFF"), 3);
  centered("PREPARED EXCLUSIVELY FOR", cx0, 430, 9.5, F.sans, GOLD, 2.2);
  const nameLines = wrap((who ?? "You").toUpperCase(), F.serifB, 30, W - 130);
  let ny = 392; nameLines.forEach((l) => { centered(l, cx0, ny, 30, F.serifB, BLACK); ny -= 36; });
  const my = ny - 14;
  page.drawLine({ start: { x: cx0 - 140, y: my + 12 }, end: { x: cx0 + 140, y: my + 12 }, thickness: 0.6, color: GOLDL });
  ([["REPORT ID", rid], ["GENERATED ON", reportDate(r.generatedAt)], ["VERSION", `Rules v${r.rulesVersion}`]] as const).forEach(([k, v], i) => {
    drawSpaced(k, cx0 - 120, my - 8 - i * 20, 6.8, F.sans, MUTE, 1.6); draw(v, cx0 + 6, my - 9 - i * 20, 9.6, F.bold, INK);
  });
  page.drawLine({ start: { x: cx0 - 140, y: my - 60 }, end: { x: cx0 + 140, y: my - 60 }, thickness: 0.6, color: GOLDL });
  const badges = ["Rule-checked", "AI-drafted outfits", "Stylist review pending"];
  const bws = badges.map((b) => tw(b, F.sans, 8.4) + 28); const gap = 10; let bx = cx0 - (bws.reduce((a, b) => a + b, 0) + gap * 2) / 2;
  const by = my - 100;
  badges.forEach((b, i) => { rr(bx, by + 24, bws[i], 24, 12, hex("#FBF5E6"), GOLDL); draw(b, bx + 14, by + 12, 8.4, F.sans, INK); bx += bws[i] + gap; });
  if (r.testMode) {
    const note = wrap("Pilot test report. StyleCraft is being tested with friends. The rules are drafts awaiting a stylist's review, so please tell us honestly what is right and wrong.", F.sans, 8.4, 330);
    note.forEach((l, i) => centered(l, cx0, 104 - i * 11, 8.4, F.sans, MUTE));
  }
  centered("HYDERABAD  ·  INDIA", cx0, 62, 7, F.sans, MUTE, 2.2);

  // ================================================================ welcome
  newPage("Welcome", "Your Personalised Style Analysis");
  para(`${who ? `Dear ${who.split(" ")[0]}, thank` : "Thank"} you for trying StyleCraft. This report blends AI-assisted outfit drafting with styling rules written from published fit and colour guides, all personalised to your own answers and measurements.`, { size: 10.6, color: INK, gap: 10 });
  card("What's inside", ["Style identity and DNA", "Personal colour palette", "Patterns, clothing types and fit guide", "Starting sizes you can trust", ...(r.tier === "report" ? ["Complete outfits and occasion add-ons", "Shopping list and 30-day plan"] : [])].map((t) => "—  " + t));
  card("How to use it", ["—  Revisit it before you shop", "—  Check the fit pages at the shop mirror", "—  Use the shopping list in order", "—  Follow the 30-day plan for lasting change"]);
  y -= 10; ensure(50);
  page.drawRectangle({ x: M, y: y - 34, width: 2, height: 34, color: GOLDL });
  draw("\"Style is the quiet consistency of a hundred small, deliberate choices.\"", M + 14, y - 14, 11, F.serif, BODY);
  drawSpaced("THE STYLECRAFT JOURNAL", M + 14, y - 30, 6.4, F.bold, GOLD, 1.6); y -= 44;

  // ================================================================ at a glance
  newPage("At a glance", "Your Style In One Page");
  card(r.styleDna.name, [r.styleDna.summary]);
  h4("Colours to wear most"); roundSwatches((r.styleDna.signature ?? r.colours.wear).slice(0, 5));
  kvCards([["Undertone", cap(r.undertone.value)], ["Formality", r.styleDna.formality ?? "-"], ...(g ? g.sizes.slice(0, 2).map((x) => [x.garment + (x.draft ? " (draft)" : ""), x.size ?? "-"] as [string, string]) : [])]);
  if (r.shopping?.buyFirst.length) { h4("Buy first"); kvCards(r.shopping.buyFirst.slice(0, 4).map((l) => [cap(l.colour), l.name] as [string, string])); }
  if (r.dontBuy.length) { h4("Skip these"); bullets(r.dontBuy.slice(0, 3).map((d) => d.item), true); }

  // ================================================================ details
  const pr = r.profile;
  if (pr) {
    newPage("Client profile", "Your Details");
    ensure(90); y -= 6;
    page.drawCircle({ x: M + 34, y: y - 34, size: 34, color: BLACK, borderColor: GOLD, borderWidth: 2 });
    centered((who ?? "You").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase(), M + 34, y - 41, 20, F.serif, GOLDL);
    draw(who ?? "Your profile", M + 86, y - 28, 17, F.serif, INK);
    drawSpaced(`${cap(pr.presentation)} · age ${pr.ageRange}`.toUpperCase(), M + 86, y - 46, 7.2, F.bold, GOLD, 1.5);
    y -= 84;
    kvCards([["Styled for", cap(pr.presentation)], ["Age range", pr.ageRange], ["Dressing for", pr.occasions.map(cap).join(", ")], ["Preferred style", pr.stylePrefs.map(cap).join(", ")],
      ["Fit", cap(pr.fit)],       ["Measurements", pr.measurements.length ? pr.measurements.map((m) => `${m.label} ${m.value}`).join(", ") : "None given"], ["Undertone", `${cap(r.undertone.value)} (${r.undertone.confidence} confidence)`]]);
    if (pr.missing.length) para(`Not given: ${pr.missing.join(", ")}. Add these next time for a more reliable size.`, { color: INK });
    para((pr.photoUsed ? "You confirmed a photo hint, read on your own device. The photo itself was never uploaded. " : "No photo hint was used. ") + "Everything here comes from your answers.", { size: 8.4, color: MUTE });
  }

  // ================================================================ style DNA
  newPage("Style DNA", "Your Style Personality");
  card(r.styleDna.name, [r.styleDna.summary]);
  kvCards([["Formality", r.styleDna.formality ?? "-"], ["Signature colours", (r.styleDna.signature ?? []).map((c) => c.name).join(", ")],
    ...(g ? [["Key pieces", g.clothing.flatMap((c) => c.picks.slice(0, 2).map((p) => p.name)).slice(0, 4).join(", ")] as [string, string]] : []), ...(pr ? [["Fit", cap(pr.fit)] as [string, string]] : [])]);
  if (r.styleDna.tips?.length) card("To stay consistent", r.styleDna.tips.map((t) => "—  " + t));

  // ================================================================ palette
  newPage("Colour analysis", "Your Personal Palette");
  lede(`${cap(r.undertone.value)} undertone. ${r.undertone.note ?? ""}`);
  para(SHADE_NOTE, { size: 8.4, color: MUTE });
  const rl = r.colours.roles;
  if (rl) {
    const best = [...rl.primary, ...rl.secondary];
    if (best.length) { h4("Best colours"); roundSwatches(best); }
    if (rl.neutral.length) { h4("Neutral colours"); roundSwatches(rl.neutral); }
    if (rl.accent.length) { h4("Accent colours"); roundSwatches(rl.accent); }
  } else roundSwatches(r.colours.wear);
  h4("Colours to avoid"); roundSwatches(r.colours.avoid);

  if (r.colours.combos?.length) {
    newPage("Colour analysis", "Colours That Work Together");
    lede("Three combinations to start with. Each one stays inside your palette.");
    for (const c of r.colours.combos) {
      ensure(56); y -= 52;
      strip(c.colours, M, y + 40, 150, 40);
      draw(c.name, M + 170, y + 22, 13, F.serif, INK);
      draw(c.colours.map((x) => x.name).join(" + "), M + 170, y + 6, 9, F.sans, MUTE);
    }
    if (r.undertone.reasons.length) para(`Based on: ${r.undertone.reasons.join(", ")}.`, { size: 8.4, color: MUTE });
  }

  if (g) {
    newPage("Patterns", "Patterns and Prints");
    lede("Start with solids, then add one pattern at a time.");
    h4("For your style"); bullets(g.patterns.wear);
    h4("If you mix patterns"); bullets(g.patterns.mixing);
    h4("Avoid"); bullets(g.patterns.avoid, true);

    newPage("Wardrobe", "What To Wear");
    lede("Buy these pieces first. Each one has a reason.");
    for (const c of g.clothing) {
      h4(c.label);
      c.picks.forEach((p, i) => {
        const lines = wrap(p.why + (p.src.length ? " " + p.src.map((s) => `[${srcNo.get(s)}]`).join("") : ""), F.sans, 9.4, W - 2 * M - 36);
        ensure(lines.length * 13.5 + 26); y -= 8;
        page.drawCircle({ x: M + 10, y: y - 6, size: 9, color: BLACK });
        centered(String(i + 1), M + 10, y - 9, 8, F.bold, GOLDL);
        draw(p.name, M + 30, y - 4, 10.2, F.bold, INK); y -= 6;
        lines.forEach((l) => { y -= 13.5; draw(l, M + 30, y + 2, 9.4, F.sans, BODY); });
        y -= 2;
      });
    }

    newPage("Body and fit", "How Things Should Fit");
    lede("Check these at the shop mirror. Shoulders first.");
    if (r.fitNotes.length) { blackBar("From your measurements"); bullets(r.fitNotes); }
    for (const f of g.fits) {
      blackBar(f.garment); sub("Check"); bullets(f.checks);
      if (f.mistakes.length) { sub("Common mistakes"); bullets(f.mistakes, true); }
    }

    newPage("Sizing", "Your Starting Sizes");
    lede("A starting point, not a promise. Always check the brand's chart.");
    table(["Garment", "Start with", "Based on"], g.sizes.map((s) => [s.garment + (s.draft ? " (draft)" : ""), s.size ?? "-", `${s.basis.replace(/[.\s]+$/, "")}. ${s.note}`]), [0.26, 0.16, 0.58], { big: 1 });
    h4("Staying safe with sizes"); bullets(g.sizeSafety);
    if (g.sizes.some((s) => s.draft)) para('"Draft" size rows are written generically and are waiting for your stylist\'s review.', { size: 8.4, color: MUTE });
  }

  // ================================================================ full report pages
  if (r.tier === "report") {
    if (r.outfits.length) {
      newPage("Outfit recommendations", "Complete Outfits");
      lede("Each outfit uses only your palette and your fit.");
      const cw = (W - 2 * M - 12) / 2;
      const layout = (o: Report["outfits"][number]) => {
        const why = o.why ? wrap("Why it suits you. " + o.why, F.sans, 8.2, cw - 32) : [];
        const swap = o.swap ? wrap(o.swap, F.sans, 7.8, cw - 24) : [];
        const h = 32 + o.items.length * 27 + 22 + (why.length ? why.length * 11 + 14 : 0) + swap.length * 10.5 + 12;
        return { h, why, swap, o };
      };
      for (let i = 0; i < r.outfits.length; i += 2) {
        const pair = r.outfits.slice(i, i + 2).map(layout);
        const h = Math.max(...pair.map((p) => p.h));
        ensure(h + 10); y -= 6;
        pair.forEach((p, n) => {
          const x = M + n * (cw + 12);
          rr(x, y, cw, h, 4, CARD, LINE);
          page.drawRectangle({ x, y: y - 26, width: cw, height: 26, color: BLACK });
          draw(p.o.name, x + 10, y - 17, 10.6, F.serif, GOLDL);
          const oc = p.o.occasion.toUpperCase(); drawSpaced(oc, x + cw - 10 - spacedW(oc, 5.8, F.bold, 1.2), y - 16, 5.8, F.bold, hex("#C9BFA6"), 1.2);
          page.drawRectangle({ x, y: y - 31, width: cw, height: 5, color: SAND });
          let iy = y - 31;
          p.o.items.forEach((it) => {
            iy -= 27;
            page.drawCircle({ x: x + 17, y: iy + 12, size: 5.5, color: hex(hexFor(it.colour)), borderColor: LINE, borderWidth: 0.7 });
            const nm = wrap(it.name, F.bold, 8.6, cw - 100)[0];
            draw(nm, x + 29, iy + 14, 8.6, F.bold, INK);
            draw(`${cap(it.colour)}${it.fit ? " · " + it.fit + " fit" : ""}`, x + 29, iy + 4, 7.2, F.sans, MUTE);
          });
          iy -= 6;
          if (p.why.length) { rr(x + 8, iy - 2, cw - 16, p.why.length * 11 + 8, 4, SAND); p.why.forEach((l, k) => draw(l, x + 14, iy - 13 - k * 11, 8.2, F.sans, BODY)); iy -= p.why.length * 11 + 14; }
          p.swap.forEach((l, k) => draw(l, x + 10, iy - 10 - k * 10.5, 7.8, F.sans, MUTE));
        });
        y -= h + 4;
      }
    }
    if (g?.occasions.length) {
      newPage("Outfit recommendations", "Special Occasions");
      for (const o of g.occasions) {
        blackBar(o.title); para(o.intro);
        if (o.colours.length) para(`Your best colours for this: ${o.colours.map(cap).join(", ")}.`, { color: INK });
        bullets(o.dos); sub("Avoid"); bullets(o.avoid, true);
      }
    }
    if (r.dontBuy.length) {
      newPage("Style mistakes", "What To Avoid");
      lede("Saying no is how this report saves you money.");
      for (const d of r.dontBuy) {
        const lines = wrap(d.reason, F.sans, 9.2, W - 2 * M - 52);
        const h = 30 + lines.length * 13;
        ensure(h + 8); y -= 8;
        rr(M, y, W - 2 * M, h, 7, REDBG, hex("#F0CFC8"));
        page.drawLine({ start: { x: M + 15, y: y - 15 }, end: { x: M + 22, y: y - 22 }, thickness: 1.2, color: RED }); page.drawLine({ start: { x: M + 22, y: y - 15 }, end: { x: M + 15, y: y - 22 }, thickness: 1.2, color: RED });
        draw(d.item, M + 36, y - 20, 10.2, F.bold, INK);
        lines.forEach((l, k) => draw(l, M + 36, y - 34 - k * 13, 9.2, F.sans, BODY));
        y -= h;
      }
    }
    if (r.shopping?.buyFirst.length) {
      const s = r.shopping;
      newPage("Wardrobe shopping checklist", "Prioritised Shopping List");
      lede("The links open each shop's own search, so the price, photos and stock are the shop's live ones. Compare a few shades from the palette pages before you buy.");
      const link = (x: number, yy: number, w: number, url: string) => {
        const ctx = doc.context;
        const ref = ctx.register(ctx.obj({ Type: "Annot", Subtype: "Link", Rect: [x, yy - 2, x + w, yy + 9], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(url) } }));
        page.node.addAnnot(ref);
      };
      const rows = [...s.buyFirst.map((l) => ({ l, first: true })), ...s.optional.map((l) => ({ l, first: false }))];
      for (const { l, first } of rows) {
        ensure(52); y -= 6;
        rr(M, y, W - 2 * M, 46, 7, CARD, LINE);
        drawSpaced((first ? "BUY FIRST" : "OPTIONAL"), M + 14, y - 15, 6.2, F.bold, first ? GOLD : MUTE, 1.4);
        draw(l.name, M + 14, y - 29, 10.4, F.bold, INK);
        const meta = `${cap(l.colour)} · ${first ? "used in " : ""}${l.outfits} outfit${l.outfits > 1 ? "s" : ""}`;
        draw(meta, W - M - 14 - tw(meta, F.sans, 8), y - 15, 8, F.sans, MUTE);
        let lx = M + 14 + 0; const ly = y - 41;
        draw("Find it:", lx, ly, 8, F.sans, MUTE); lx += tw("Find it:", F.sans, 8) + 8;
        for (const sh of shopLinks(l, r.profile?.presentation)) {
          const w = tw(sh.name, F.bold, 8.4); draw(sh.name, lx, ly, 8.4, F.bold, GOLD);
          page.drawLine({ start: { x: lx, y: ly - 1.5 }, end: { x: lx + w, y: ly - 1.5 }, thickness: 0.5, color: GOLD });
          link(lx, ly, w, sh.href); lx += w + 14;
        }
        y -= 46;
      }
    }
    if (g?.finishing.length) { newPage("Finishing details", "Finishing Touches"); bullets(g.finishing); }

    newPage("Improvement plan", "Your 30-Day Style Plan");
    for (const p of [...r.plan].sort((a, b) => a.week - b.week)) {
      const lines = wrap(p.action, F.sans, 9.6, W - 2 * M - 84);
      const h = 34 + lines.length * 13.5;
      ensure(h + 8); y -= 8;
      rr(M, y, W - 2 * M, h, 8, CARD, LINE);
      page.drawCircle({ x: M + 30, y: y - h / 2, size: 17, borderColor: GOLDL, borderWidth: 1 });
      centered(String(p.week).padStart(2, "0"), M + 30, y - h / 2 - 4, 12, F.serif, GOLD);
      draw(p.focus, M + 62, y - 20, 11.5, F.serif, INK);
      lines.forEach((l, k) => draw(l, M + 62, y - 35 - k * 13.5, 9.6, F.sans, BODY));
      y -= h;
    }
    para("Free outfit check: within 7 days of delivery, send a photo of an outfit from your report page and get short feedback.", { size: 9.4, color: INK });

    newPage("Final summary", "Bringing It All Together");
    ensure(110); y -= 6;
    rr(M, y, W - 2 * M, 96, 6, BLACK);
    centered("StyleCraft Rule-Checked Profile", W / 2, y - 26, 14, F.serif, GOLDL);
    const cs: [string, string][] = [["RULES", `v${r.rulesVersion} applied`], ["OUTFITS", r.source === "template" ? "Rule-based" : "AI-drafted, rule-checked"], ["STYLIST REVIEW", r.review.stylistReviewed ? "Done" : "Pending"], ["REPORT ID", rid]];
    const qw = (W - 2 * M - 24) / 4;
    cs.forEach(([k, v], i) => { drawSpaced(k, M + 12 + i * qw, y - 58, 6, F.bold, GOLDL, 1.3); wrap(v, F.sans, 8.4, qw - 8).forEach((l, n) => draw(l, M + 12 + i * qw, y - 71 - n * 11, 8.4, F.sans, CREAMTXT)); });
    y -= 108;
    const promise = "Our 7-day promise. If something in this report is wrong for you, tell us within 7 days and we will fix it or refund you." + (r.testMode ? " Pilot reports are free, so there is nothing to refund; your feedback is how we fix it." : "");
    const pl = wrap(promise, F.sans, 9.6, W - 2 * M - 34);
    ensure(pl.length * 14 + 30); y -= 4;
    page.drawRectangle({ x: M, y: y - pl.length * 14 - 18, width: W - 2 * M, height: pl.length * 14 + 18, color: SAND });
    page.drawRectangle({ x: M, y: y - pl.length * 14 - 18, width: 3, height: pl.length * 14 + 18, color: GOLD });
    pl.forEach((l, k) => draw(l, M + 16, y - 18 - k * 14, 9.6, F.sans, BODY));
    y -= pl.length * 14 + 26;
    h4("What comes next");
    para("Style card: colours, fit basics and your style in one line.   Full report: this report, with outfits, a don't-buy list and a 30-day plan.   Stylist session: one hour with a real stylist, in person or on video. Prices will be shared at launch.", { size: 9.2 });
  }

  // ================================================================ transparency
  newPage("Transparency", "How This Report Was Made");
  para(`Draft, reviewed by StyleCraft rules v${r.rulesVersion}. Your answers set the limits (colours and fit). An AI drafted the outfits inside those limits. Then the rules checked every item${r.review.itemsChanged ? ` and changed ${r.review.itemsChanged} of ${r.review.itemsTotal}` : ""}. A stylist has ${r.review.stylistReviewed ? "" : "not yet "}reviewed these rules.`, { color: INK });
  para(`Source: ${r.source === "ai" ? "AI draft, checked by rules" : r.source === "ai+template" ? "AI draft topped up with rule-based outfits" : "Rule-based outfits (the AI was not used)"}.`, { size: 8.4, color: MUTE });
  if (g?.sources.length) {
    h4("Where the advice comes from");
    g.sources.forEach((s, i) => para(`[${i + 1}] ${s.publisher}: ${s.title}. ${s.url}`, { size: 8.2, indent: 4, gap: 2 }));
    para("(house rule) = a style judgement, not a measured fact. Style is partly opinion.", { size: 8.2, color: MUTE });
  }
  h4("Your data");
  para("Your face photo is never uploaded or stored. Your name, number and outfit-check photos are deleted about 7 days after delivery.");

  // ================================================================ closing page
  page = doc.addPage([W, H]); bg(BLACK); kinds.push("dark");
  const dl = await loadLogo(doc, "logo-dark.png");
  if (dl) { const w2 = 170, h2 = w2 * dl.height / dl.width; page.drawImage(dl, { x: W / 2 - w2 / 2, y: H / 2 + 40, width: w2, height: h2 }); }
  else centered("SC", W / 2, H / 2 + 48, 28, F.serif, GOLD);
  centered("Thank you for choosing StyleCraft", W / 2, H / 2 - 20, 20, F.serif, hex("#FFFFFF"));
  centered("Your style is more than clothing.", W / 2, H / 2 - 48, 9.6, F.sans, CREAMTXT);
  centered("It is a reflection of your personality, confidence and story.", W / 2, H / 2 - 62, 9.6, F.sans, CREAMTXT);
  centered("CRAFT YOUR STYLE. OWN YOUR STORY.", W / 2, H / 2 - 100, 7.6, F.sans, GOLD, 3);

  // ---- footer: STYLECRAFT left, n / N right
  const pages = doc.getPages(); const total = pages.length;
  pages.forEach((pg, i) => {
    if (kinds[i] !== "page") return;
    drawSpaced("STYLECRAFT", M, 34, 6.6, F.bold, GOLD, 2.4, pg);
    const n = `${i + 1} / ${total}`; draw(n, W - M - tw(n, F.bold, 6.8), 34, 6.8, F.bold, GOLD, pg);
  });
  return doc.save();
}
