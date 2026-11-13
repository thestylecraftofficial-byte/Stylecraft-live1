import type { Report } from "@/lib/report/types";

const cap = (s: string) => s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
const rupees = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function ReportView({ report: r, token }: { report: Report; token: string }) {
  return (
    <main className="report">
      <header className="cover">
        <p className="eyebrow light">Your style report</p>
        <h1>{r.styleDna.name}</h1>
        <p>{r.styleDna.summary}</p>
        <div className="dots">{r.colours.wear.slice(0, 5).map((c) => <span key={c.name} style={{ background: c.hex }} title={c.name} />)}</div>
        <p className="stamp">✓ Checked by StyleCraft rules v{r.rulesVersion} · {new Date(r.generatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
        <a className="primary dl" href={`/r/${token}/pdf`}>Download PDF</a>
        {r.tier === "report" && <a className="primary dl" style={{ marginTop: 10, background: "none", border: "1px solid #B4472F" }} href={`/r/${token}/check`}>Free outfit check</a>}
      </header>

      <section className="card">
        <p className="eyebrow">Recommended colours</p>
        <h2>{cap(r.undertone.value)} undertone</h2>
        <h3>Wear these</h3>
        <div className="swatches">{r.colours.wear.map((c) => <div key={c.name}><span style={{ background: c.hex }} /><small>{c.name}</small></div>)}</div>
        <h3>Skip these</h3>
        <div className="swatches">{r.colours.avoid.map((c) => <div key={c.name}><span style={{ background: c.hex }} /><small>{c.name}</small></div>)}</div>
        <p className="hint">{r.undertone.reasons.join(" ")} Confidence: <b>{r.undertone.confidence}</b>. Try colours on in daylight.</p>
      </section>

      <section className="card">
        <p className="eyebrow">Fit and size</p>
        <p>{r.size.size ? <>Starting size <b>{r.size.size}</b>. </> : null}<span className="hint">{r.size.note}</span></p>
        <ul>{r.fitNotes.map((n) => <li key={n}>{n}</li>)}</ul>
      </section>

      {r.outfits.length > 0 && <section>
        <h2>Outfits</h2>
        {r.outfits.map((o) => (
          <article className="card" key={o.name}>
            <p className="eyebrow">{o.occasion}</p>
            <h3>{o.name}</h3>
            <ul>{o.items.map((i) => <li key={i.name}>{i.name} · {cap(i.colour)} · about {rupees(i.pricePerPiece)}</li>)}</ul>
          </article>
        ))}
      </section>}

      {r.dontBuy.length > 0 && <section className="card">
        <p className="eyebrow">Don’t-buy list</p>
        <ul>{r.dontBuy.map((d) => <li key={d.item}><b>{d.item}</b>: {d.reason}</li>)}</ul>
      </section>}

      {r.plan.length > 0 && <section className="card">
        <p className="eyebrow">Your 30-day plan</p>
        <ol>{[...r.plan].sort((a, b) => a.week - b.week).map((p) => <li key={p.week + p.focus}><b>Week {p.week} · {p.focus}.</b> {p.action}</li>)}</ol>
      </section>}

      {r.tier === "card" && <p className="hint">This is your style card. The full report adds outfits, a don’t-buy list and a 30-day plan.</p>}
    </main>
  );
}
