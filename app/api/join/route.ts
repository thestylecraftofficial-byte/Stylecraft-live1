import { NextResponse } from "next/server";
import { identityDb } from "@/lib/supabase";
import { addWaitlist, waitlistSchema } from "@/lib/people";
import { sendPendingThanks } from "@/lib/waitlistmail";
import { formLimiter, visitorKey } from "@/lib/spam";

export const dynamic = "force-dynamic";

// Called by public/waitlist.html (the page posts JSON as text/plain). Answers {status}: "saved" | "invalid" | "busy" | "error".
export async function POST(req: Request) {
  const key = "join:" + visitorKey(req);
  if (formLimiter.locked(key)) return NextResponse.json({ status: "busy" });
  let body: unknown = null;
  try { body = JSON.parse(await req.text()); } catch { /* falls through to invalid */ }
  const parsed = waitlistSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ status: "invalid" });
  formLimiter.fail(key);
  if (parsed.data.hp) return NextResponse.json({ status: "saved" }); // a bot filled the hidden field: pretend it worked
  try {
    const fresh = await addWaitlist(identityDb(), parsed.data);
    // Send the thank-you now; if Gmail is unavailable or at its limit it stays pending for the daily job. The visitor never sees any of it.
    if (fresh) await sendPendingThanks(identityDb()).catch(() => undefined);
  } catch { return NextResponse.json({ status: "error" }); }
  return NextResponse.json({ status: "saved" });
}
