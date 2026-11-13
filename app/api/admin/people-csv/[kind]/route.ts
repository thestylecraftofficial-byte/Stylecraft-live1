import { identityDb } from "@/lib/supabase";
import { listPeople } from "@/lib/people";
import { stylistsCsv, waitlistCsv } from "@/lib/pilot";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { kind: string } }) {
  if (params.kind !== "waitlist" && params.kind !== "stylists") return new Response("Not found", { status: 404 });
  const p = await listPeople(identityDb());
  const body = params.kind === "waitlist" ? waitlistCsv(p.waitlist) : stylistsCsv(p.stylists);
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="stylecraft-${params.kind}-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
}
