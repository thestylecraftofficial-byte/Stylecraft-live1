import { NextResponse } from "next/server";
import { identityDb } from "@/lib/supabase";
import { sendPendingThanks } from "@/lib/waitlistmail";

export const dynamic = "force-dynamic";

// Daily: sends thank-you emails that are still waiting (for example because Gmail's daily limit was reached). Same CRON_SECRET as the deletion job.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ ok: true, ...(await sendPendingThanks(identityDb())) }); }
  catch (e) { console.error("waitlist mail job failed:", e instanceof Error ? e.message.split(":")[0] : "unknown"); return NextResponse.json({ error: "Job failed" }, { status: 500 }); }
}
