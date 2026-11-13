import type { SupabaseClient } from "@supabase/supabase-js";
import type { Report } from "./report/types";

export type FlaggedRow = { id: string; profileId: string; token: string; createdAt: string; report: Report };

export async function listFlagged(anonymous: SupabaseClient): Promise<FlaggedRow[]> {
  const { data } = await anonymous.from("reports").select("id,profile_id,access_token,created_at,report").eq("status", "flagged").order("created_at");
  return (data ?? []).map((r) => ({ id: r.id, profileId: r.profile_id, token: r.access_token, createdAt: r.created_at, report: r.report as Report }));
}

// Reports that are approved and waiting to be sent. Name and phone are read here only, from the identity store,
// because the founder needs them to send the report. They are deleted 7 days after delivery.
export async function listReadyToSend(anonymous: SupabaseClient, identity: SupabaseClient) {
  const { data: reports } = await anonymous.from("reports").select("profile_id,access_token").eq("status", "ready");
  if (!reports?.length) return [];
  const ids = reports.map((r) => r.profile_id);
  const { data: links } = await identity.from("links").select("profile_id,customer_id").in("profile_id", ids);
  const { data: customers } = await identity.from("customers").select("id,name,phone").in("id", (links ?? []).map((l) => l.customer_id));
  const byCust = new Map((customers ?? []).map((c) => [c.id, c]));
  const custOf = new Map((links ?? []).map((l) => [l.profile_id, byCust.get(l.customer_id)]));
  return reports.flatMap((r) => {
    const c = custOf.get(r.profile_id);
    return c ? [{ profileId: r.profile_id as string, token: r.access_token as string, name: c.name as string, phone: c.phone as string }] : [];
  });
}

export function whatsappLink(phone: string, text: string) {
  let d = phone.replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
