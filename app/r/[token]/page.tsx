import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { anonymousDb, identityDb } from "@/lib/supabase";
import { getReportRow } from "@/lib/report/fetch";
import { hasFeedback } from "@/lib/feedback";
import { labelFor, retryFor } from "@/lib/testmode";
import ReportView from "./ReportView";
import PremiumReport from "./PremiumReport";
import FeedbackForm from "./FeedbackForm";
import Preparing from "./Preparing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your style report · StyleCraft", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: { token: string } }) {
  const row = await getReportRow(anonymousDb(), params.token);
  if (!row) notFound();
  if (row.status === "pending") return <Preparing token={params.token} />;
  if (!row.report || !["ready", "delivered"].includes(row.status)) notFound();

  const report = row.report;
  const given = await hasFeedback(anonymousDb(), params.token);
  const feedback = !given ? <FeedbackForm token={params.token} /> : null;

  // Reports made before the guide existed keep the older layout.
  if (!report.guide) return (<><ReportView report={report} token={params.token} />{feedback && <main className="report">{feedback}</main>}</>);

  let preparedFor: string | null = null;
  let retryHref: string | null = null;
  try {
    preparedFor = await labelFor(identityDb(), row.profileId); // gone after the retention period
    if (row.testMode) { const r = await retryFor(identityDb(), row.profileId); if (r) retryHref = `/start?t=${r.code}`; }
  } catch { /* the report still shows without them */ }
  return <PremiumReport report={report} token={params.token} preparedFor={preparedFor} retryHref={retryHref}>{feedback}</PremiumReport>;
}
