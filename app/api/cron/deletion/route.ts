import { NextResponse } from "next/server";
import { runDeletion } from "@/lib/deletion";
import { anonymousDb, identityDb, RETENTION_DAYS } from "@/lib/supabase";

// Called once a day by a scheduler (Vercel Cron, Supabase cron or any HTTP cron).
// Send:  Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const db = anonymousDb();
    const result = await runDeletion(db, db, RETENTION_DAYS);
    // Pilot links hold a friend's name, so they go on the same clock (counted from when the link expired).
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
    await identityDb().from("test_links").delete().lt("expires_at", cutoff);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("deletion failed:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
