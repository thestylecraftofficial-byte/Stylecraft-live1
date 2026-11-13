import { NextResponse } from "next/server";
import { identityDb } from "@/lib/supabase";
import { checkTestLink } from "@/lib/testmode";

export const dynamic = "force-dynamic";

// Tells the start page whether the visitor's link works. Returns no personal data except the first name on the link.
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("t");
  try {
    const st = await checkTestLink(identityDb(), code);
    if (!st.ok) return NextResponse.json({ valid: false, reason: st.reason });
    return NextResponse.json({ valid: true, firstName: st.link.label.split(/\s+/)[0], remaining: st.remaining });
  } catch (e) {
    console.error("test-link failed:", e instanceof Error ? e.message.split(":")[0] : "unknown");
    return NextResponse.json({ valid: false, reason: "error" }, { status: 503 }); // not the person's fault: the page says so
  }
}
