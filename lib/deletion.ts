import type { SupabaseClient } from "@supabase/supabase-js";

export type DeletionResult = {
  customersDeleted: number;
  linksDeleted: number;
  photosDeleted: number;
  unconsentedProfilesDeleted: number;
};

// Runs the database deletion, then removes the matching photo files from storage.
// Order matters: rows are removed first so a customer is never left half-deleted if storage is slow.
export async function runDeletion(
  anonymous: SupabaseClient,
  storage: SupabaseClient,
  retentionDays: number
): Promise<DeletionResult> {
  const { data, error } = await anonymous.rpc("run_deletion", { retention_days: retentionDays });
  if (error) throw new Error("run_deletion: " + error.message);
  const row = Array.isArray(data) ? data[0] : data;

  const paths: string[] = row?.photos_due ?? [];
  if (paths.length) {
    const { error: sErr } = await storage.storage.from("outfit-checks").remove(paths);
    if (sErr) throw new Error("storage: " + sErr.message);
  }

  return {
    customersDeleted: row?.customers_deleted ?? 0,
    linksDeleted: row?.links_deleted ?? 0,
    photosDeleted: paths.length,
    unconsentedProfilesDeleted: row?.unconsented_profiles_deleted ?? 0,
  };
}
