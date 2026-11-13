import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found · StyleCraft", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <main style={{ textAlign: "center", paddingTop: 80 }}>
      <p className="eyebrow">StyleCraft</p>
      <h1>We could not find that page</h1>
      <p className="hint" style={{ maxWidth: 460, margin: "0 auto 24px" }}>
        The link may be old, mistyped or already expired. If you were sent a styling link, message us on Instagram and we will send you a fresh one.
      </p>
      <p style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <a className="primary" style={{ width: "auto", display: "inline-block" }} href="/">Back to home</a>
        <a className="primary" style={{ width: "auto", display: "inline-block", background: "transparent", color: "var(--dark)", border: "1px solid var(--dark)" }} href="https://www.instagram.com/thestyle.craft/" target="_blank" rel="noopener noreferrer">Message us on Instagram</a>
      </p>
    </main>
  );
}
