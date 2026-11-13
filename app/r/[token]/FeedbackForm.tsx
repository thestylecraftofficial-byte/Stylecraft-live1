"use client";

import { useState } from "react";
import { FEEDBACK_TAGS } from "@/lib/feedback";

const SCALE = ["Way off", "Mostly off", "Partly right", "Mostly right", "Spot on"];

export default function FeedbackForm({ token }: { token: string }) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [feltWrong, setFeltWrong] = useState("");
  const [liked, setLiked] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setError("Please choose how accurate the report felt."); return; }
    setState("sending"); setError("");
    const res = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, rating, tags, feltWrong: feltWrong.trim() || undefined, liked: liked.trim() || undefined }) });
    if (res.ok) setState("done"); else { setError("Could not save. Please try again."); setState("idle"); }
  }

  if (state === "done") return <section className="card fb" id="feedback"><p><b>Thank you.</b> Your feedback helps us improve the rules.</p></section>;
  return (
    <form className="card fb" id="feedback" onSubmit={send}>
      <p className="eyebrow">Your feedback</p>
      <label>How accurate did this report feel for you?</label>
      <div className="chips">{[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className={"chip" + (rating === n ? " on" : "")}><input type="radio" name="rating" checked={rating === n} onChange={() => setRating(n)} />{n} · {SCALE[n - 1]}</label>
      ))}</div>
      <label>What felt wrong or missing? (optional)</label>
      <textarea rows={3} maxLength={600} value={feltWrong} onChange={(e) => setFeltWrong(e.target.value)} placeholder="A colour, a size, an outfit, a piece of advice…" />
      <label>What did you like? (optional)</label>
      <textarea rows={3} maxLength={600} value={liked} onChange={(e) => setLiked(e.target.value)} />
      <p className="hint">Please do not type phone numbers or addresses.</p>
      <label>Anything that stood out? (optional)</label>
      <div className="chips">{FEEDBACK_TAGS.map(([id, text]) => {
        const on = tags.includes(id);
        return <label key={id} className={"chip" + (on ? " on" : "")}><input type="checkbox" checked={on} onChange={() => setTags(on ? tags.filter((x) => x !== id) : [...tags, id])} />{text}</label>;
      })}</div>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="primary" disabled={state === "sending"}>Send feedback</button>
    </form>
  );
}
