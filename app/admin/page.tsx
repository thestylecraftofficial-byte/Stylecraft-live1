import { headers } from "next/headers";
import { anonymousDb, identityDb, RETENTION_DAYS } from "@/lib/supabase";
import { feedbackSummary } from "@/lib/feedback";
import { listPendingChecks } from "@/lib/check/service";
import { listPilot, type PilotEntry } from "@/lib/pilot";
import { setupChecks } from "@/lib/setupcheck";
import { listPeople, STATUSES, SPECIALITIES, EXPERIENCE, AVAILABILITY, label } from "@/lib/people";
import CopyField from "./CopyField";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · StyleCraft", robots: { index: false, follow: false } };

const cap = (s: string) => s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
const TABS = ["overview", "links", "results", "waitlist", "stylists", "checks", "setup"] as const;
type Tab = (typeof TABS)[number];
const hit = (q: string, ...f: (string | null | undefined)[]) => !q || f.some((x) => (x ?? "").toLowerCase().includes(q));

export default async function Admin({ searchParams }: { searchParams: { tab?: string; new?: string; q?: string; status?: string; err?: string } }) {
  const tab: Tab = (TABS as readonly string[]).includes(searchParams.tab ?? "") ? (searchParams.tab as Tab) : "overview";
  const q = (searchParams.q ?? "").trim().toLowerCase().slice(0, 80);
  const anonymous = anonymousDb();
  const [checks, fb, pilot, people] = await Promise.all([listPendingChecks(anonymous), feedbackSummary(anonymous), listPilot(identityDb(), anonymous), listPeople(identityDb())]);
  const setup = setupChecks(); const todo = setup.filter((c) => c.status === "fix");
  const h = headers();
  const base = process.env.NEXT_PUBLIC_SITE_URL || `https://${h.get("host")}`;
  const newCode = /^[a-z2-9]{10}$/.test(searchParams.new ?? "") ? searchParams.new! : null;
  const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Calcutta", dateStyle: "medium", timeStyle: "short" });
  const activeLinks = pilot.links.filter((l) => l.state === "active");
  const newStylists = people.stylists.filter((s) => s.status === "new").length;
  const waiting = people.waitlist.filter((w) => w.mail_status !== "sent" && w.mail_status !== "failed").length;
  const href = (t: Tab, extra = "") => `/admin?tab=${t}${extra}`;

  const counts: Record<Tab, { n: number; alert?: boolean } | null> = {
    overview: null, links: { n: activeLinks.length }, results: { n: pilot.entries.length }, waitlist: { n: people.waitlist.length },
    stylists: { n: newStylists || people.stylists.length, alert: newStylists > 0 }, checks: { n: checks.length, alert: checks.length > 0 }, setup: todo.length ? { n: todo.length, alert: true } : null,
  };
  const NAMES: Record<Tab, string> = { overview: "Overview", links: "Report links", results: "Results", waitlist: "Waitlist", stylists: "Stylists", checks: "Outfit checks", setup: "Setup" };

  const LinkForm = (
    <form method="post" action="/api/admin/links">
      <div className="ad-f2">
        <div><label htmlFor="lb">Person’s name (optional)</label><input id="lb" type="text" name="label" maxLength={80} placeholder="e.g. Rahul" /></div>
        <div><label htmlFor="nt">Note to yourself (optional)</label><input id="nt" type="text" name="note" maxLength={300} placeholder="e.g. college friend, wears mostly kurtas" /></div>
      </div>
      <p style={{ margin: "14px 0 0" }}><button className="ad-btn acc">Create 24-hour link</button></p>
      <p className="ad-hint">Works for 24 hours. One report, plus one redo if they made a mistake.</p>
    </form>
  );
  const Problem = searchParams.err && (
    <div className="ad-note" role="alert" style={{ borderColor: "#9B2C1A" }}><p><b>That did not work.</b> {searchParams.err === "link" ? "The link could not be created. Check the Setup tab (Supabase), then try again." : "Something went wrong. Please try again."}</p></div>
  );
  const NewLink = newCode && (
    <div className="ad-note"><p><b>New link ready. Copy it and send it:</b></p><CopyField value={`${base}/start?t=${newCode}`} label="Copy link" /></div>
  );

  const results = pilot.entries.filter((e) => hit(q, e.label, e.note, e.report?.report?.styleDna.name));
  const waitlist = people.waitlist.filter((w) => hit(q, w.name, w.email, w.area, w.source));
  const status = (STATUSES as readonly string[]).includes(searchParams.status ?? "") ? searchParams.status! : "";
  const stylists = people.stylists.filter((s) => (!status || s.status === status) && hit(q, s.name, s.email, s.city, s.phone));

  const Search = ({ t, placeholder }: { t: Tab; placeholder: string }) => (
    <form className="ad-search" method="get" action="/admin">
      <input type="hidden" name="tab" value={t} />
      {t === "stylists" && status && <input type="hidden" name="status" value={status} />}
      <input type="search" name="q" defaultValue={searchParams.q ?? ""} placeholder={placeholder} aria-label="Search" />
      <button className="ad-btn ghost">Search</button>
      {q && <a className="ad-btn ghost" href={href(t, t === "stylists" && status ? `&status=${status}` : "")}>Clear</a>}
    </form>
  );

  const Result = ({ e }: { e: PilotEntry }) => {
    const r = e.report?.report; const a = e.answers; const f = e.feedback;
    return (
      <section className="ad-card">
        <div className="ad-res-h">
          <div><b>{e.label}</b><p className="ad-sub">{e.note ? `${e.note} · ` : ""}{when(e.usedAt)}</p></div>
          <div className="ad-actions">
            {f?.rating != null ? <span className={"ad-badge " + (f.rating >= 4 ? "ok" : f.rating === 3 ? "warn" : "bad")}>Accuracy {f.rating}/5</span> : <span className="ad-badge">No feedback yet</span>}
            <span className="ad-badge">{e.report?.status ?? "no report"}{e.report?.source ? ` · ${e.report.source}` : ""}</span>
          </div>
        </div>
        <div className="ad-cols">
          <div>
            <h4>Their answers</h4>
            {a ? (<ul>
              <li>{cap(a.presentation)} · age {a.ageRange}</li><li>Occasions: {a.occasions.map(cap).join(", ")}</li><li>Styles: {a.stylePrefs.map(cap).join(", ")}</li>
              <li>Fit: {cap(a.fit)} · budget {a.budgetBand}</li><li>{a.measurements.length ? a.measurements.map((m) => `${m.label} ${m.value}`).join(", ") : "No measurements"}</li>
              {a.missing.length > 0 && <li>Not given: {a.missing.join(", ")}</li>}<li>Photo hint: {a.photoUsed ? "yes" : "no"}</li>
            </ul>) : <p className="ad-hint">Not available.</p>}
          </div>
          <div>
            <h4>Their report</h4>
            {r ? (<ul>
              <li>{r.styleDna.name} · {cap(r.undertone.value)} undertone</li><li>{r.outfits.length} outfits · rules changed {r.review.itemsChanged} of {r.review.itemsTotal} AI items</li>
              {r.guide && <li>Sizes: {r.guide.sizes.map((x) => `${x.garment.split(" ")[0]} ${x.size ?? "-"}`).join(", ")}</li>}
            </ul>) : <p className="ad-hint">Still preparing, or not built.</p>}
            {e.report && <p style={{ marginTop: 10 }}><a className="ad-link" href={`/r/${e.report.token}`} target="_blank" rel="noopener">Open report</a> · <a className="ad-link" href={`/r/${e.report.token}/pdf`}>PDF</a></p>}
          </div>
          <div>
            <h4>Their feedback</h4>
            {f ? (<>
              {f.feltWrong && <p><b>Felt wrong:</b> {f.feltWrong}</p>}
              {f.liked && <p><b>Liked:</b> {f.liked}</p>}
              {f.tags.length > 0 && <p className="ad-hint">{f.tags.join(", ")}</p>}
              {!f.feltWrong && !f.liked && f.tags.length === 0 && <p className="ad-hint">Score only.</p>}
            </>) : <p className="ad-hint">No feedback yet.</p>}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="ad">
      <header className="ad-top">
        <div className="ad-top-in">
          <a className="ad-brand" href={href("overview")}>STYLE<b>CRAFT</b><small>FOUNDER VIEW</small></a>
          <form method="post" action="/api/admin/logout"><button className="ad-out">Sign out</button></form>
        </div>
        <nav className="ad-tabs" aria-label="Admin sections">
          {TABS.map((t) => (
            <a key={t} className="ad-tab" href={href(t)} aria-current={t === tab ? "page" : undefined}>{NAMES[t]}
              {counts[t] && <span className={"ad-pill" + (counts[t]!.alert ? " alert" : "")}>{counts[t]!.n}</span>}</a>
          ))}
        </nav>
      </header>

      <main className="ad-wrap">
        {tab === "overview" && (<>
          <div className="ad-head"><div><h1>Overview</h1><p className="ad-sub">What’s happening across StyleCraft.</p></div></div>
          <div className="ad-grid ad-stats">
            <a className="ad-stat" href={href("waitlist")}><span>Waitlist</span><b>{people.waitlist.length}</b><em>{waiting > 0 ? `${waiting} thank-you email${waiting === 1 ? "" : "s"} waiting` : "all emailed"}</em></a>
            <a className="ad-stat" href={href("results")}><span>Reports</span><b>{pilot.entries.length}</b><em>{fb.count} with feedback</em></a>
            <a className="ad-stat" href={href("results")}><span>Avg accuracy</span><b>{fb.count ? fb.avgRating.toFixed(1) : "–"}</b><em>out of 5</em></a>
            <a className="ad-stat" href={href("links")}><span>Active links</span><b>{activeLinks.length}</b><em>{pilot.links.length} made in total</em></a>
            <a className="ad-stat" href={href("stylists")}><span>Stylist applications</span><b>{people.stylists.length}</b><em>{newStylists} new</em></a>
            <a className="ad-stat" href={href("checks")}><span>Outfit checks</span><b>{checks.length}</b><em>waiting for you</em></a>
          </div>
          <div className="ad-grid ad-2">
            <section className="ad-card"><h2>Create a report link</h2><p className="ad-sub">Make a link, then send it on WhatsApp.</p>{LinkForm}{Problem}{NewLink}</section>
            <div className="ad-stack">
              <section className="ad-card">
                <h2>Setup</h2>
                {todo.length === 0 ? <p className="ad-sub"><span className="ad-badge ok">All required settings are in place</span></p> : (<>
                  <p className="ad-sub"><span className="ad-badge bad">{todo.length} to fix</span></p>
                  <ul className="ad-list" style={{ marginTop: 12 }}>{todo.map((c) => <li key={c.id}><span className="ad-dot fix">✗</span><span><b>{c.label}</b><small>{c.hint}</small></span></li>)}</ul>
                </>)}
                <p style={{ marginTop: 12 }}><a className="ad-link" href={href("setup")}>See full checklist</a></p>
              </section>
              <section className="ad-card">
                <h2>Latest feedback</h2>
                {pilot.entries.filter((e) => e.feedback).slice(0, 3).map((e) => (
                  <p key={e.profileId} style={{ margin: "10px 0 0", fontSize: 14 }}><b>{e.label}</b> · <span className="ad-badge">{e.feedback!.rating ?? "–"}/5</span>{e.feedback!.feltWrong ? <> · {e.feedback!.feltWrong}</> : e.feedback!.liked ? <> · {e.feedback!.liked}</> : null}</p>
                ))}
                {pilot.entries.every((e) => !e.feedback) && <p className="ad-sub">No feedback yet.</p>}
              </section>
            </div>
          </div>
        </>)}

        {tab === "links" && (<>
          <div className="ad-head"><div><h1>Report links</h1><p className="ad-sub">A report can only be started from a link you create here.</p></div></div>
          <section className="ad-card" style={{ marginBottom: 14 }}>{LinkForm}{Problem}{NewLink}</section>
          {pilot.links.length === 0 ? <div className="ad-empty">No links yet. Create the first one above.</div> : (
            <div className="ad-tw"><div className="scroll"><table>
              <thead><tr><th>Person</th><th>Note</th><th>Created</th><th>Expires</th><th>Reports</th><th>Status</th><th>Link</th></tr></thead>
              <tbody>{pilot.links.map((l) => (
                <tr key={l.id}><td data-l="Person"><b>{l.label}</b></td><td data-l="Note">{l.note ?? "–"}</td><td data-l="Created">{when(l.created_at)}</td><td data-l="Expires">{when(l.expires_at)}</td>
                  <td data-l="Reports">{l.uses} of {l.max_attempts}</td>
                  <td data-l="Status"><span className={"ad-badge " + (l.state === "active" ? "ok" : "")}>{cap(l.state)}</span></td>
                  <td data-l="Link" style={{ minWidth: 220 }}>{l.state === "active" ? <CopyField value={`${base}/start?t=${l.code}`} /> : "–"}</td></tr>
              ))}</tbody>
            </table></div></div>
          )}
        </>)}

        {tab === "results" && (<>
          <div className="ad-head"><div><h1>Results</h1><p className="ad-sub">What each person answered, the report they got, and their feedback. Names are deleted {RETENTION_DAYS} days after the link is used, so download the CSV before then.</p></div>
            <div className="ad-actions">{pilot.entries.length > 0 && <a className="ad-btn" href="/api/admin/export">Download CSV</a>}</div></div>
          <Search t="results" placeholder="Search by name, note or style…" />
          {results.length === 0 ? <div className="ad-empty">{q ? "No matches." : "No reports yet."}</div> : <div className="ad-res">{results.map((e) => <Result key={e.profileId} e={e} />)}</div>}
        </>)}

        {tab === "waitlist" && (<>
          <div className="ad-head"><div><h1>Waitlist</h1><p className="ad-sub">{people.waitlist.length} people · {people.waitlist.filter((w) => w.mail_status === "sent").length} thank-you emails sent · {waiting} waiting</p></div>
            <div className="ad-actions">{people.waitlist.length > 0 && <a className="ad-btn" href="/api/admin/people-csv/waitlist">Download CSV</a>}</div></div>
          <Search t="waitlist" placeholder="Search by name, email or city…" />
          {waitlist.length === 0 ? <div className="ad-empty">{q ? "No matches." : "Nobody has joined yet."}</div> : (
            <div className="ad-tw"><div className="scroll"><table>
              <thead><tr><th>Name</th><th>Email</th><th>City</th><th>Interested in</th><th>Source</th><th>Joined</th><th>Thank-you mail</th><th /></tr></thead>
              <tbody>{waitlist.map((w) => (
                <tr key={w.id}><td data-l="Name"><b>{w.name}</b></td><td data-l="Email">{w.email ?? "–"}</td><td data-l="City">{w.area || "–"}</td><td data-l="Interested in">{w.interests.join(", ") || "–"}</td><td data-l="Source">{w.source ?? "–"}</td><td data-l="Joined">{when(w.created_at)}</td>
                  <td data-l="Mail"><span className={"ad-badge " + (w.mail_status === "sent" ? "ok" : w.mail_status === "failed" ? "bad" : "warn")}>{w.mail_status === "sent" ? "Sent" : w.mail_status === "failed" ? "Failed" : "Waiting"}</span></td>
                  <td data-l=""><form method="post" action="/api/admin/people"><input type="hidden" name="id" value={w.id} /><input type="hidden" name="kind" value="waitlist" /><button className="ad-btn danger sm" name="action" value="delete">Delete</button></form></td></tr>
              ))}</tbody>
            </table></div></div>
          )}
        </>)}

        {tab === "stylists" && (<>
          <div className="ad-head"><div><h1>Stylist applications</h1><p className="ad-sub">{people.stylists.length} in total · {newStylists} new</p></div>
            <div className="ad-actions">{people.stylists.length > 0 && <a className="ad-btn" href="/api/admin/people-csv/stylists">Download CSV</a>}</div></div>
          <section className="ad-card" style={{ marginBottom: 14 }}><h3>Application form link</h3><p className="ad-sub">Share this only with stylists you invite.</p><div style={{ marginTop: 10 }}><CopyField value={`${base}/stylists/apply`} /></div></section>
          <div className="ad-chips">
            <a className="ad-chip" href={href("stylists", q ? `&q=${encodeURIComponent(q)}` : "")} aria-current={!status}>All</a>
            {STATUSES.map((s) => <a key={s} className="ad-chip" href={href("stylists", `&status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`)} aria-current={status === s}>{cap(s)}</a>)}
          </div>
          <Search t="stylists" placeholder="Search by name, email, city or phone…" />
          {stylists.length === 0 ? <div className="ad-empty">{q || status ? "No matches." : "No applications yet."}</div> : (
            <div className="ad-res">{stylists.map((s) => (
              <section className="ad-card" key={s.id}>
                <div className="ad-res-h"><div><b>{s.name}</b><p className="ad-sub">{s.city} · {label(EXPERIENCE, s.experience)} · applied {when(s.created_at)}</p></div>
                  <span className={"ad-badge " + (s.status === "new" ? "dark" : s.status === "shortlisted" ? "ok" : s.status === "rejected" ? "bad" : "warn")}>{cap(s.status)}</span></div>
                <p style={{ margin: "0 0 6px", fontSize: 14 }}>{s.specialities.map((x) => label(SPECIALITIES, x)).join(", ")}{s.languages ? ` · ${s.languages}` : ""} · {label(AVAILABILITY, s.availability)}</p>
                <p style={{ margin: "0 0 6px", fontSize: 14 }}>{s.phone} · {s.email}{s.portfolio_url && <> · <a className="ad-link" href={s.portfolio_url} target="_blank" rel="noopener noreferrer">Portfolio</a></>}</p>
                {s.about && <p style={{ margin: "0 0 10px", fontSize: 14 }}>{s.about}</p>}
                <form method="post" action="/api/admin/people" className="ad-actions" style={{ marginTop: 10 }}>
                  <input type="hidden" name="id" value={s.id} /><input type="hidden" name="kind" value="stylist" />
                  <select name="status" defaultValue={s.status} style={{ width: "auto" }} aria-label="Status">{STATUSES.map((x) => <option key={x} value={x}>{cap(x)}</option>)}</select>
                  <button className="ad-btn sm" name="action" value="status">Save status</button><button className="ad-btn danger sm" name="action" value="delete">Delete</button>
                </form>
              </section>
            ))}</div>
          )}
        </>)}

        {tab === "checks" && (<>
          <div className="ad-head"><div><h1>Outfit checks</h1><p className="ad-sub">Photos are private and deleted 7 days after upload. Write a short, kind note: what works, one change, one alternative.</p></div></div>
          {checks.length === 0 ? <div className="ad-empty">No photos waiting.</div> : <div className="ad-res">{checks.map((c) => (
            <section className="ad-card" key={c.id}>
              <p className="ad-sub" style={{ marginTop: 0, marginBottom: 10 }}>{cap(c.occasion ?? "outfit")} · profile {c.profileId.slice(0, 4)}…</p>
              {c.photoUrl ? <img className="ad-photo" src={c.photoUrl} alt="Outfit to check" /> : <p className="ad-hint">Photo not available.</p>}
              <form method="post" action="/api/admin/action">
                <input type="hidden" name="checkId" value={c.id} />
                <textarea name="feedback" required minLength={10} maxLength={1500} rows={4} style={{ marginTop: 12 }} placeholder="Your feedback for the customer" />
                <p style={{ margin: "10px 0 0" }}><button className="ad-btn acc" name="action" value="answer-check">Send feedback</button></p>
              </form>
            </section>
          ))}</div>}
        </>)}

        {tab === "setup" && (<>
          <div className="ad-head"><div><h1>Setup</h1><p className="ad-sub">{todo.length === 0 ? "All required settings are in place." : `${todo.length} to fix. Values are never shown here.`}</p></div></div>
          <section className="ad-card"><ul className="ad-list">{setup.map((c) => (
            <li key={c.id}><span className={"ad-dot " + c.status}>{c.status === "ok" ? "✓" : c.status === "fix" ? "✗" : "i"}</span><span><b>{c.label}</b>{c.status !== "ok" && <small>{c.hint}</small>}</span></li>
          ))}</ul></section>
        </>)}
      </main>
    </div>
  );
}
