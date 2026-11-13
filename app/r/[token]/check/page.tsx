import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { anonymousDb } from "@/lib/supabase";
import { checkStateByToken } from "@/lib/check/service";
import CheckForm from "./CheckForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Outfit check · StyleCraft", robots: { index: false, follow: false } };
const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

export default async function Page({ params }: { params: { token: string } }) {
  if (!TOKEN.test(params.token)) notFound();
  const s = await checkStateByToken(anonymousDb(), params.token);
  if (!s) notFound();
  return (
    <main className="report">
      <p><a href={`/r/${params.token}`}>← Back to my report</a></p>
      <h1>Outfit check</h1>
      {!s.eligible && <p className="card">The outfit check comes with the full report.</p>}
      {s.eligible && !s.used && (<><p className="hint">Send one photo of an outfit you plan to wear. A StyleCraft stylist will look at it and write back. Your photo is deleted after 7 days.</p><CheckForm token={params.token} /></>)}
      {s.eligible && s.used && s.waiting && <p className="card">Thanks, we have your photo. Your feedback will appear here soon.</p>}
      {s.feedback.map((f, i) => (
        <section className="card" key={i}>
          <p className="eyebrow">Feedback{f.occasion ? ` · ${f.occasion}` : ""}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{f.feedback}</p>
        </section>
      ))}
    </main>
  );
}
