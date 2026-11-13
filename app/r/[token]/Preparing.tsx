"use client";

import { useEffect, useRef, useState } from "react";

// Shown while a report is being built. Calls the server again after each pause until the report is ready, then reloads the page.
export default function Preparing({ token }: { token: string }) {
  const [msg, setMsg] = useState("Preparing your report…");
  const [tries, setTries] = useState(0);
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout>;
    async function go(n: number) {
      if (stopped.current) return;
      let wait = 6;
      try {
        const res = await fetch("/api/report/prepare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }), cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (j.status === "ready" || j.status === "delivered" || j.status === "flagged") { window.location.reload(); return; } // full reload: the sure way to show the finished report
        if (typeof j.waitSeconds === "number") wait = Math.min(Math.max(j.waitSeconds, 3), 8); // asking early is cheap: the server only answers with the time left
      } catch { wait = 10; }
      setTries(n + 1);
      if (n >= 2) setMsg("Our stylist engine is busy right now. We are still on it, and this page will update by itself.");
      timer = setTimeout(() => go(n + 1), wait * 1000);
    }
    go(0);
    return () => { stopped.current = true; clearTimeout(timer); };
  }, [token]);

  return (
    <main style={{ textAlign: "center", paddingTop: 80 }}>
      <p className="eyebrow">StyleCraft</p>
      <h1>{msg}</h1>
      <p className="hint">This usually takes under a minute. Please keep this page open. Your answers are saved, so you do not need to fill the form again.</p>
      <div className="progress" aria-hidden style={{ maxWidth: 260, margin: "24px auto" }}><div style={{ width: `${Math.min(90, 20 + tries * 15)}%`, transition: "width .6s" }} /></div>
    </main>
  );
}
