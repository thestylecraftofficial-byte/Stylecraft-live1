/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { memoryClient, memoryDbEnabled } from "./dev-memory-db";

// Server-side only. The service role key bypasses row level security, so it must never reach the browser.
function client(schema: "identity" | "anonymous"): SupabaseClient<any, any, any> {
  if (memoryDbEnabled()) return memoryClient(schema); // local try-out mode, never in production
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are not set");
  return createClient(url, key, { db: { schema }, auth: { persistSession: false } });
}

export const identityDb = () => client("identity");
export const anonymousDb = () => client("anonymous");

export const RETENTION_DAYS = Number(process.env.RETENTION_DAYS ?? 7);
