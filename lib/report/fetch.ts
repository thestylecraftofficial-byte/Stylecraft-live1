import type { SupabaseClient } from "@supabase/supabase-js";
import type { Report } from "./types";

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;
export const validToken = (t: string) => TOKEN.test(t);

// Only reports that are approved (ready) or already delivered are visible by link. Flagged ones are not.
export async function getReportByToken(anonymous: SupabaseClient, token: string): Promise<Report | null> {
  const row = await getReportRow(anonymous, token);
  return row && row.report && ["ready", "delivered"].includes(row.status) ? row.report : null;
}

export type ReportRow = { status: string; report: Report | null; profileId: string; testMode: boolean };

// Also reports "pending", so the page can show the "preparing your report" screen.
export async function getReportRow(anonymous: SupabaseClient, token: string): Promise<ReportRow | null> {
  if (!TOKEN.test(token)) return null;
  const { data } = await anonymous.from("reports").select("report,status,profile_id,test_mode").eq("access_token", token).maybeSingle();
  if (!data) return null;
  return { status: data.status, report: (data.report as Report) ?? null, profileId: data.profile_id, testMode: !!data.test_mode };
}
