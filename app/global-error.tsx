"use client";

// Last line of defence: used only if the main layout itself fails.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F6F1EA", color: "#1E1A24", textAlign: "center", padding: "80px 16px" }}>
        <h1 style={{ fontFamily: "Georgia, serif" }}>Something went wrong</h1>
        <p>Please try again in a moment. If it keeps happening, message us on Instagram @thestyle.craft.</p>
        <button onClick={() => reset()} style={{ padding: "12px 22px", border: 0, borderRadius: 10, background: "#1E1A24", color: "#F6F1EA", fontWeight: 700, cursor: "pointer" }}>Try again</button>
      </body>
    </html>
  );
}
