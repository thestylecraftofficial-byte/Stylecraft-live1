import { anonymousDb, identityDb } from "@/lib/supabase";
import { getReportRow } from "@/lib/report/fetch";
import { renderPdf } from "@/lib/report/pdf";
import { labelFor } from "@/lib/testmode";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  let row: Awaited<ReturnType<typeof getReportRow>>;
  try { row = await getReportRow(anonymousDb(), params.token); }
  catch { return new Response("We could not load your report just now. Please try again in a minute.", { status: 503 }); }
  if (!row?.report || !["ready", "delivered"].includes(row.status)) return new Response("Not found", { status: 404 });
  let preparedFor: string | null = null;
  try { preparedFor = await labelFor(identityDb(), row.profileId); } catch { /* shown without a name */ }
  let bytes: Uint8Array;
  try { bytes = await renderPdf(row.report, { token: params.token, preparedFor }); }
  catch (e) {
    console.error("pdf failed:", e instanceof Error ? e.message.split(":")[0] : "unknown");
    return new Response("We could not make your PDF just now. The report on the page is fine. Please try again in a minute.", { status: 500 });
  }
  return new Response(bytes, {
    headers: { "content-type": "application/pdf", "content-disposition": 'attachment; filename="stylecraft-report.pdf"', "cache-control": "private, no-store" },
  });
}
