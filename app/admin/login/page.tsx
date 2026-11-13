import type { Metadata } from "next";
import "../admin.css";

export const metadata: Metadata = { title: "Sign in · StyleCraft", robots: { index: false, follow: false } };
const MSG: Record<string, string> = { bad: "That password is not right.", lock: "Too many wrong tries. Please wait 15 minutes and try again." };

export default function Login({ searchParams }: { searchParams: { e?: string } }) {
  const msg = MSG[searchParams.e ?? ""];
  return (
    <div className="ad" style={{ display: "grid", placeItems: "center", padding: "24px max(16px,env(safe-area-inset-left,0px))" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <p className="ad-brand" style={{ textAlign: "center", color: "#17100C", marginBottom: 22 }}>STYLE<b style={{ color: "#B98450" }}>CRAFT</b><small style={{ color: "#6F6558" }}>FOUNDER VIEW</small></p>
        <form method="post" action="/api/admin/login" className="ad-card">
          <h1 style={{ fontSize: 28 }}>Sign in</h1>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus style={{ width: "100%", padding: "10px 12px", border: "1px solid #E8DFD0", borderRadius: 10, font: "inherit" }} />
          {msg && <p role="alert" style={{ color: "#B4472F", fontSize: 14, margin: "10px 0 0" }}>{msg}</p>}
          <p style={{ margin: "16px 0 0" }}><button className="ad-btn acc" style={{ width: "100%" }}>Sign in</button></p>
        </form>
      </div>
    </div>
  );
}
