"use client";
import { useEffect } from "react";

// Shown when a page crashes. Never shows technical details; the error is only logged.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("page error", error.digest ?? ""); }, [error]);
  return (
    <main style={{ textAlign: "center", paddingTop: 80 }}>
      <p className="eyebrow">StyleCraft</p>
      <h1>Something went wrong on our side</h1>
      <p className="hint" style={{ maxWidth: 460, margin: "0 auto 24px" }}>
        This is not your fault, and anything you already submitted is safe. Please try again in a moment. If it keeps happening, message us on Instagram and mention this code: {error.digest ?? "none"}.
      </p>
      <p style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="primary" style={{ width: "auto" }} onClick={() => reset()}>Try again</button>
        <a className="primary" style={{ width: "auto", display: "inline-block", background: "transparent", color: "var(--dark)", border: "1px solid var(--dark)" }} href="https://www.instagram.com/thestyle.craft/" target="_blank" rel="noopener noreferrer">Message us on Instagram</a>
      </p>
    </main>
  );
}
