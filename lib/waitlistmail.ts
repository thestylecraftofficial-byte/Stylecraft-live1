import type { SupabaseClient } from "@supabase/supabase-js";
import { mailConfigured, sendThanks, type SendResult } from "./mail";

const MAX_TRIES = 8;
type Sender = (to: string, name: string) => Promise<SendResult>;

// Sends the thank-you to everyone still 'pending', oldest first. When Gmail says the daily limit is reached, it stops quietly and
// the rest stay pending for the next daily run. People are never told about this.
export async function sendPendingThanks(identity: SupabaseClient, opts: { only?: string; send?: Sender; now?: Date } = {}) {
  const out = { sent: 0, left: 0 };
  if (!opts.send && !mailConfigured()) return out;
  const send = opts.send ?? sendThanks;
  const cap = Number(process.env.GMAIL_DAILY_LIMIT) || 400; // stay under Gmail's own limit
  const day = (opts.now ?? new Date()).toISOString().slice(0, 10);
  const { data: all } = await identity.from("waitlist").select("*").order("created_at", { ascending: true });
  const rows = (all ?? []) as { id: string; name: string; email: string | null; mail_status: string; mail_sent_at: string | null; mail_tries: number }[];
  let today = rows.filter((r) => r.mail_status === "sent" && r.mail_sent_at?.slice(0, 10) === day).length;
  const queue = rows.filter((r) => r.mail_status === "pending" && r.email && (!opts.only || r.id === opts.only));
  for (const r of queue) {
    if (today >= cap) break;
    const res = await send(r.email!, r.name);
    if (res === "sent") { today++; out.sent++; await identity.from("waitlist").update({ mail_status: "sent", mail_sent_at: (opts.now ?? new Date()).toISOString() }).eq("id", r.id); }
    else if (res === "limit") break;
    else { const tries = r.mail_tries + 1; await identity.from("waitlist").update({ mail_tries: tries, mail_status: tries >= MAX_TRIES ? "failed" : "pending" }).eq("id", r.id); }
  }
  out.left = queue.length - out.sent;
  return out;
}
