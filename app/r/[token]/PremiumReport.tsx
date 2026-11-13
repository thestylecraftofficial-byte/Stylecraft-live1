import type { ReactNode } from "react";
import "@/app/report.css";
import { hexFor, useFor, shadesFor, SHADE_NOTE } from "@/lib/report/colours";
import type { GuideRule } from "@/lib/rules/guide";
import type { Report, Swatch } from "@/lib/report/types";
import { reportId } from "@/lib/report/meta";
import { shopLinks, affiliateHref, affiliateStatus } from "@/lib/report/shoplinks";

const cap = (s: string) => s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
const dateText = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const waitlist = process.env.NEXT_PUBLIC_WAITLIST_URL || "/";


function Strip({ list }: { list: Swatch[] }) {
  return <div className="strip">{list.map((c) => <i key={c.name} style={{ background: c.hex }} title={c.name} />)}</div>;
}
function Rounds({ list }: { list: Swatch[] }) {
  return <div className="rounds">{list.map((c) => <div className="round" key={c.name}><i style={{ background: c.hex }} /><b>{c.name}</b><small>{useFor(c.name)}</small>{c.why && <small className="whytag">{c.why}</small>}{shadesFor(c.name).length > 0 && <span className="shades">{shadesFor(c.name).map((x) => <em key={x.name}><u style={{ background: x.hex }} />{x.name}</em>)}</span>}</div>)}</div>;
}
function Rules({ rules, srcIndex, no }: { rules: GuideRule[]; srcIndex: Map<string, number>; no?: boolean }) {
  return (
    <ul className={"rules" + (no ? " no" : "")}>
      {rules.map((r) => (
        <li key={r.text}>{r.text}
          {r.src.length > 0 ? <span className="tag">{r.src.map((s) => `[${srcIndex.get(s)}]`).join(" ")}</span>
            : <span className="tag house" title="A style judgement the stylist reviews first">◈ house rule</span>}
        </li>
      ))}
    </ul>
  );
}

type Props = { report: Report; token: string; retryHref?: string | null; preparedFor?: string | null; children?: ReactNode };

export default function PremiumReport({ report: r, token, retryHref, preparedFor, children }: Props) {
  const g = r.guide;
  const full = r.tier === "report";
  const srcIndex = new Map((g?.sources ?? []).map((s, i) => [s.id, i + 1] as const));
  const pages: { eyebrow: string; title: string; body: ReactNode }[] = [];
  const add = (eyebrow: string, title: string, body: ReactNode) => pages.push({ eyebrow, title, body });
  const pr = r.profile;
  const who = preparedFor?.trim() || null;

  add("Welcome", "Your Personalised Style Analysis", (
    <>
      <div className="welcome-ticks"><span>✓ Rule-checked</span><span>✓ AI-drafted outfits</span><span>✓ Stylist review pending</span></div>
      <p>{who ? `Dear ${who.split(" ")[0]}, thank` : "Thank"} you for trying StyleCraft. This report blends AI-assisted outfit drafting with styling rules written from published fit and colour guides, all personalised to your own answers and measurements.</p>
      <div className="grid2" style={{ marginTop: 14 }}>
        <div className="card"><h3>What’s inside</h3><ul className="dash">
          <li>Style identity and DNA</li><li>Personal colour palette</li><li>Patterns, clothing types and fit guide</li><li>Starting sizes you can trust</li>
          {full && <><li>Complete outfits and occasion add-ons</li><li>Shopping list and 30-day plan</li></>}
        </ul></div>
        <div className="card"><h3>How to use it</h3><ul className="dash">
          <li>Revisit it before you shop</li><li>Check the fit pages at the shop mirror</li><li>Use the shopping list in order</li><li>Follow the 30-day plan for lasting change</li>
        </ul></div>
      </div>
      <div className="quote">“Style is the quiet consistency of a hundred small, deliberate choices.”<small>The StyleCraft Journal</small></div>
    </>
  ));

  add("At a glance", "Your Style In One Page", (
    <>
      <div className="card glance"><small>Your style identity</small><h3>{r.styleDna.name}</h3><p>{r.styleDna.summary}</p></div>
      <h4>Colours to wear most</h4><Rounds list={(r.styleDna.signature ?? r.colours.wear).slice(0, 5)} />
      <div className="grid2">
        <div className="kv"><small>Undertone</small><b>{cap(r.undertone.value)}</b></div>
        <div className="kv"><small>Formality</small><b>{r.styleDna.formality ?? "-"}</b></div>
        {g && g.sizes.slice(0, 2).map((x) => <div className="kv" key={x.garment}><small>{x.garment}{x.draft ? " (draft)" : ""}</small><b>{x.size ?? "-"}</b></div>)}
      </div>
      {r.shopping && r.shopping.buyFirst.length > 0 && <><h4>Buy first</h4><div className="grid2">{r.shopping.buyFirst.slice(0, 4).map((l) => <div className="kv" key={l.name + l.colour}><small>{cap(l.colour)} · used in {l.outfits} outfit{l.outfits > 1 ? "s" : ""}</small><b>{l.name}</b></div>)}</div></>}
      {r.dontBuy.length > 0 && <><h4>Skip these</h4><ul className="rules no">{r.dontBuy.slice(0, 3).map((d) => <li key={d.item}>{d.item}</li>)}</ul></>}
    </>
  ));

  if (pr) add("Client profile", "Your Details", (
    <>
      <div className="avatar"><i>{(who ?? "You").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()}</i><div><b>{who ?? "Your profile"}</b><small>{cap(pr.presentation)} · age {pr.ageRange}</small></div></div>
      <div className="grid2">
        {([["Styled for", cap(pr.presentation)], ["Age range", pr.ageRange], ["Dressing for", pr.occasions.map(cap).join(", ")], ["Preferred style", pr.stylePrefs.map(cap).join(", ")],
          ["Fit", cap(pr.fit)], ["Measurements", pr.measurements.length ? pr.measurements.map((m) => `${m.label} ${m.value}`).join(" · ") : "None given"], ["Undertone", `${cap(r.undertone.value)} (${r.undertone.confidence} confidence)`]] as const).map(([k, v]) => <div className="kv" key={k}><small>{k}</small><b>{v}</b></div>)}
      </div>
      {pr.missing.length > 0 && <p style={{ marginTop: 14 }}><b>Not given:</b> {pr.missing.join(", ")}. Add these next time for a more reliable size.</p>}
      <p className="tiny">{pr.photoUsed ? "You confirmed a photo hint, read on your own device. The photo itself was never uploaded." : "No photo hint was used."} Everything here comes from your answers.</p>
    </>
  ));

  add("Style DNA", "Your Style Personality", (
    <>
      <div className="card"><h3>{r.styleDna.name}</h3><p>{r.styleDna.summary}</p>
        {pr && <div className="chips">{["smart-casual", "classic", "minimal", "street", "ethnic", "trendy", "sporty"].map((s) => <span key={s} className={pr.stylePrefs.includes(s) ? "on" : ""}>{cap(s)}</span>)}</div>}
      </div>
      <div className="grid2" style={{ marginTop: 12 }}>
        <div className="kv"><small>Formality</small><b>{r.styleDna.formality ?? "—"}</b></div>
        <div className="kv"><small>Signature colours</small><b>{r.styleDna.signature?.map((c) => c.name).join(", ")}</b></div>
        {g && <div className="kv"><small>Key pieces</small><b>{g.clothing.flatMap((c) => c.picks.slice(0, 2).map((p) => p.name)).slice(0, 4).join(", ")}</b></div>}
        {pr && <div className="kv"><small>Fit</small><b>{cap(pr.fit)}</b></div>}
      </div>
      {r.styleDna.tips && r.styleDna.tips.length > 0 && <div className="card" style={{ marginTop: 12 }}><h3>To stay consistent</h3><ul className="rules">{r.styleDna.tips.map((t) => <li key={t}>{t}</li>)}</ul></div>}
    </>
  ));

  const rl = r.colours.roles;
  add("Colour analysis", "Your Personal Palette", (
    <>
      <p className="lede">{cap(r.undertone.value)} undertone. {r.undertone.note}</p>
      {rl ? (<>
        {[...rl.primary, ...rl.secondary].length > 0 && <><h4>Best colours</h4><Rounds list={[...rl.primary, ...rl.secondary]} /></>}
        {rl.neutral.length > 0 && <><h4>Neutral colours</h4><Rounds list={rl.neutral} /></>}
        {rl.accent.length > 0 && <><h4>Accent colours</h4><Rounds list={rl.accent} /></>}
      </>) : <Rounds list={r.colours.wear} />}
      <h4>Colours to avoid</h4><Rounds list={r.colours.avoid} />
    </>
  ));

  if (r.colours.combos?.length) add("Colour analysis", "Colours That Work Together", (
    <>
      <p className="lede">Three combinations to start with. Each one stays inside your palette.</p>
      {r.colours.combos.map((c) => <div className="combo" key={c.name}><Strip list={c.colours} /><div><b>{c.name}</b><br /><small>{c.colours.map((x) => x.name).join(" + ")}</small></div></div>)}
      {r.undertone.reasons.length > 0 && <p className="tiny">Based on: {r.undertone.reasons.join(", ")}.</p>}
    </>
  ));

  if (g) {
    add("Patterns", "Patterns and Prints", (
      <>
        <p className="lede">Start with solids, then add one pattern at a time.</p>
        <h4>For your style</h4><Rules rules={g.patterns.wear} srcIndex={srcIndex} />
        <h4>If you mix patterns</h4><Rules rules={g.patterns.mixing} srcIndex={srcIndex} />
        <h4>Avoid</h4><Rules rules={g.patterns.avoid} srcIndex={srcIndex} no />
      </>
    ));
    add("Wardrobe", "What To Wear", (
      <>
        <p className="lede">Buy these pieces first. Each one has a reason.</p>
        {g.clothing.map((c) => (
          <div className="card" key={c.category} style={{ marginTop: 12 }}>
            <h3>{c.label}</h3>
            {c.picks.map((p, i) => <div className="pick" key={p.name}><span className="n">{i + 1}</span><div><b>{p.name}</b><br />{p.why}{p.src.length > 0 && <span className="tag">{p.src.map((s) => `[${srcIndex.get(s)}]`).join(" ")}</span>}</div></div>)}
          </div>
        ))}
      </>
    ));
    add("Body and fit", "How Things Should Fit", (
      <>
        <p className="lede">Check these at the shop mirror. Shoulders first.</p>
        {r.fitNotes.length > 0 && <div className="card" style={{ marginTop: 12 }}><h3>From your measurements</h3><ul className="rules">{r.fitNotes.map((n) => <li key={n}>{n}</li>)}</ul></div>}
        {g.fits.map((f) => (
          <div className="bcard" style={{ marginTop: 14 }} key={f.garment}>
            <header>{f.garment}</header><div className="band" />
            <div className="inner">
              <span className="sub">Check</span><Rules rules={f.checks} srcIndex={srcIndex} />
              {f.mistakes.length > 0 && <><span className="sub">Common mistakes</span><Rules rules={f.mistakes} srcIndex={srcIndex} no /></>}
            </div>
          </div>
        ))}
      </>
    ));
    add("Sizing", "Your Starting Sizes", (
      <>
        <p className="lede">A starting point, not a promise. Always check the brand’s chart.</p>
        <div className="scroll"><table className="tbl">
          <thead><tr><th>Garment</th><th>Start with</th><th>Based on</th></tr></thead>
          <tbody>{g.sizes.map((s) => (
            <tr key={s.garment}><td><b>{s.garment}</b>{s.draft && <span className="draft">draft</span>}</td><td className="big">{s.size ?? "—"}</td><td>{s.basis}<br /><small>{s.note}</small></td></tr>
          ))}</tbody>
        </table></div>
        <h4>Staying safe with sizes</h4><Rules rules={g.sizeSafety} srcIndex={srcIndex} />
        {g.sizes.some((s) => s.draft) && <p className="tiny">“Draft” size rows are written generically and are waiting for your stylist’s review.</p>}
      </>
    ));
  }

  if (full) {
    if (r.outfits.length) add("Outfit recommendations", "Complete Outfits", (
      <>
        <p className="lede">Each outfit uses only your palette and your fit.</p>
        <div className="grid2">
          {r.outfits.map((o) => {
            return (
              <article className="bcard" key={o.name}>
                <header>{o.name}<em>{o.occasion}</em></header><div className="band" />
                <div className="inner">
                  {o.items.map((i) => <div className="row" key={i.name}><i style={{ background: hexFor(i.colour) }} /><span>{i.name}<br /><small>{cap(i.colour)}{i.fit ? ` · ${i.fit} fit` : ""}</small></span></div>)}
                  {o.why && <div className="why"><b>Why it suits you.</b> {o.why}</div>}
                  {o.swap && <p className="tiny">{o.swap}</p>}
                </div>
              </article>
            );
          })}
        </div>
      </>
    ));
    if (g && g.occasions.length) add("Outfit recommendations", "Special Occasions", (
      <>
        {g.occasions.map((o) => (
          <div className="bcard" style={{ marginTop: 12 }} key={o.id}>
            <header>{o.title}</header><div className="band" />
            <div className="inner">
              <p>{o.intro}</p>
              {o.colours.length > 0 && <p><b>Your best colours for this:</b> {o.colours.map(cap).join(", ")}.</p>}
              <Rules rules={o.dos} srcIndex={srcIndex} />
              <span className="sub">Avoid</span><Rules rules={o.avoid} srcIndex={srcIndex} no />
            </div>
          </div>
        ))}
      </>
    ));
    if (r.dontBuy.length) add("Style mistakes", "What To Avoid", (
      <>
        <p className="lede">Saying no is how this report saves you money.</p>
        {r.dontBuy.map((d) => <div className="redcard" key={d.item}><span className="x">✕</span><div><b>{d.item}</b>{d.reason}</div></div>)}
      </>
    ));
    if (r.shopping && r.shopping.buyFirst.length) {
      const s = r.shopping;
      add("Wardrobe shopping checklist", "Prioritised Shopping List", (
        <>
        <p className="lede">The links open each shop’s own search, so the price, photos and stock you see are the shop’s live ones. Compare a few shades from the palette pages before you buy.</p>
        {affiliateStatus().any && <p className="tiny"><b>Affiliate disclosure.</b> Some of these links are affiliate links: if you buy through them, StyleCraft may earn a small commission, at no extra cost to you. Our recommendations are made by our rules and are never changed because of commission.{affiliateStatus().amazon ? " As an Amazon Associate I earn from qualifying purchases." : ""}</p>}
        <div className="scroll"><table className="tbl">
          <thead><tr><th>Priority</th><th>Item</th><th>Colour</th><th>Reason</th><th>Find it</th></tr></thead>
          <tbody>
            {[...s.buyFirst.map((l) => ({ l, first: true })), ...s.optional.map((l) => ({ l, first: false }))].map(({ l, first }) => (
              <tr key={l.name + l.colour}><td className={first ? "pri" : undefined}>{first ? "Buy first" : "Optional"}</td><td>{first ? <b>{l.name}</b> : l.name}</td><td>{cap(l.colour)}</td>
                <td>{first ? "Used in " : ""}{l.outfits} outfit{l.outfits > 1 ? "s" : ""}</td>
                <td className="finds">{shopLinks(l, pr?.presentation).map((x) => { const a = affiliateHref(x.id, x.href); return <a key={x.id} href={a.href} target="_blank" rel={a.affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"}>{x.name}</a>; })}</td></tr>
            ))}
          </tbody>
        </table></div>
        </>
      ));
    }
    if (g && g.finishing.length) add("Finishing details", "Finishing Touches", <Rules rules={g.finishing} srcIndex={srcIndex} />);
    add("Improvement plan", "Your 30-Day Style Plan", (
      <>
        {[...r.plan].sort((a, b) => a.week - b.week).map((p) => <div className="step" key={p.week + p.focus}><span className="n">{String(p.week).padStart(2, "0")}</span><div><b>{p.focus}</b>{p.action}</div></div>)}
        <div className="cta" style={{ justifyContent: "flex-start" }}><a className="btn ghost" href={`/r/${token}/check`}>Free outfit check (within 7 days)</a>{retryHref && <a className="btn ghost" href={retryHref}>Made a mistake? Redo once</a>}</div>
      </>
    ));
    add("Final summary", "Bringing It All Together", (
      <>
        <div className="certified"><h3>StyleCraft Rule-Checked Profile</h3>
          <div className="cs"><div><small>Rules</small>v{r.rulesVersion} applied</div><div><small>Outfits</small>{r.source === "template" ? "Rule-based" : "AI-drafted, rule-checked"}</div><div><small>Stylist review</small>{r.review.stylistReviewed ? "Done" : "Pending"}</div><div><small>Report ID</small>{reportId(r, token)}</div></div>
        </div>
        <div className="promise"><b>Our 7-day promise.</b> If something in this report is wrong for you, tell us within 7 days and we will fix it or refund you.{r.testMode && <> <span className="tiny">Pilot reports are free, so there is nothing to refund. Your feedback below is how we fix it.</span></>}</div>
        <h4>What comes next</h4>
        <div className="grid3">
          <div className="card"><h3>Style card</h3><small>Colours, fit basics and your style in one line.</small></div>
          <div className="card" style={{ borderColor: "#B8963E" }}><h3>Full report</h3><small>This report: outfits, don’t-buy list, 30-day plan.</small></div>
          <div className="card"><h3>Stylist session</h3><small>One hour with a real stylist, in person or on video.</small></div>
        </div>
        <p className="tiny">Prices will be shared at launch. <a href={waitlist} style={{ color: "#B8963E" }}>Join the waitlist</a>.</p>
      </>
    ));
  }

  add("Transparency", "How This Report Was Made", (
    <>
      <p><b>Draft, reviewed by StyleCraft rules v{r.rulesVersion}.</b> Your answers set the limits (colours and fit). An AI drafted the outfits inside those limits. Then the rules checked every item{r.review.itemsChanged > 0 ? ` and changed ${r.review.itemsChanged} of ${r.review.itemsTotal}` : ""}. A stylist has {r.review.stylistReviewed ? "" : "not yet "}reviewed these rules.</p>
      <p className="tiny">Source: {r.source === "ai" ? "AI draft, checked by rules" : r.source === "ai+template" ? "AI draft topped up with rule-based outfits" : "Rule-based outfits (the AI was not used)"}.</p>
      {g && g.sources.length > 0 && <><h4>Where the advice comes from</h4>
        <ol className="src">{g.sources.map((s) => <li key={s.id}>{s.publisher}: <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ol>
        <p className="tiny">◈ house rule = a style judgement, not a measured fact. Style is partly opinion.</p></>}
      <h4>Your data</h4>
      <p>Your face photo is never uploaded or stored. Your name, number and outfit-check photos are deleted about 7 days after delivery.</p>
    </>
  ));

  const total = pages.length + 2;
  return (
    <main className="pr">
      <header className="cover">
        <div className="logo"><img className="logoimg" src="/logo.png" alt="StyleCraft: Craft your style. Own your story." width={260} height={228} /></div>
        <div className="conf">Confidential personal style analysis</div>
        <p className="prep">Prepared exclusively for</p>
        <div className="who">{who ?? "You"}</div>
        <div className="meta"><span>Report ID</span><b>{reportId(r, token)}</b><span>Generated on</span><b>{dateText(r.generatedAt)}</b><span>Version</span><b>Rules v{r.rulesVersion}</b></div>
        <div className="badges"><span>Rule-checked</span><span>AI-drafted outfits</span><span>Stylist review pending</span></div>
        <div className="cta"><a className="btn" href={`/r/${token}/pdf`}>Download PDF</a>{full && <a className="btn ghost" href={`/r/${token}/check`}>Free outfit check</a>}</div>
        <div className="foot-note">Hyderabad · India</div>
      </header>

      {pages.map((pg, i) => (
        <section className="rp" key={pg.title}>
          <div className="eyebrow">{pg.eyebrow}</div>
          <h2>{pg.title}</h2>
          <div className="body">{pg.body}</div>
          <div className="rp-foot"><span>StyleCraft</span><span>{i + 2} / {total}</span></div>
        </section>
      ))}

      <section className="dark-page">
        <div className="disc"><img src="/logo.png" alt="StyleCraft" width={150} height={131} /></div>
        <h2>Thank you for choosing StyleCraft</h2>
        <p>Your style is more than clothing. It is a reflection of your personality, confidence and story.</p>
        <p className="gl">Craft your style. Own your story.</p>
      </section>
      {r.tier === "card" && <p className="tiny" style={{ textAlign: "center" }}>This is your style card. The full report adds outfits, a don’t-buy list and a 30-day plan.</p>}
      {children}
    </main>
  );
}
