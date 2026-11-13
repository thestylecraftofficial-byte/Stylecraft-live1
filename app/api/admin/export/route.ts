import { anonymousDb, identityDb } from "@/lib/supabase";
import { listPilot, toCsv } from "@/lib/pilot";

export const dynamic = "force-dynamic";

// Behind the admin password (see middleware.ts). One row per friend's report: answers, report summary and feedback.
export async function GET(req: Request) {
  const { entries } = await listPilot(identityDb(), anonymousDb());
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  return new Response(toCsv(entries, base), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="stylecraft-pilot-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" },
  });
}
