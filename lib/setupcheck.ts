// A plain-language checklist of the settings a live site needs. It looks only at whether each setting exists and is long enough,
// and never returns a value, so it is safe to show on the admin page.
export type Check = { id: string; label: string; status: "ok" | "fix" | "info"; hint: string };

export function setupChecks(env: Record<string, string | undefined> = process.env): Check[] {
  const has = (k: string, min = 1) => (env[k]?.trim().length ?? 0) >= min;
  const prod = env.NODE_ENV === "production";
  const c = (id: string, label: string, ok: boolean, hint: string, bad: Check["status"] = "fix"): Check => ({ id, label, status: ok ? "ok" : bad, hint });
  const siteOk = /^https:\/\/[^/\s]+/.test(env.NEXT_PUBLIC_SITE_URL ?? "") || (!prod && /^http:\/\/localhost(:\d+)?\/?$/.test(env.NEXT_PUBLIC_SITE_URL ?? ""));
  return [
    c("db-url", "Supabase project address", has("NEXT_PUBLIC_SUPABASE_URL"), "Add NEXT_PUBLIC_SUPABASE_URL in Vercel (Supabase, Project Settings, API)."),
    c("db-key", "Supabase service key", has("SUPABASE_SERVICE_ROLE_KEY", 20), "Add SUPABASE_SERVICE_ROLE_KEY (the service_role key, never the anon key)."),
    c("dev-db", "Not using the stand-in database", !(prod && env.DEV_MEMORY_DB === "true"), "Remove DEV_MEMORY_DB from Vercel. It keeps data in memory only and loses it."),
    c("admin", "Admin password is long", has("ADMIN_PASSWORD", 12), "Set ADMIN_PASSWORD to at least 12 characters."),
    c("cron", "Daily deletion job is protected", has("CRON_SECRET", 24), "Set CRON_SECRET to a long random text (24+ characters)."),
    c("site", "Public site address", siteOk, "Set NEXT_PUBLIC_SITE_URL to your https address, for example https://yourname.vercel.app."),
    c("gemini", "Gemini key", has("GEMINI_API_KEY", 10), "Add GEMINI_API_KEY in Vercel only. Without it every report uses the rule-based version.", "info"),
    c("mail", "Waitlist thank-you email (Gmail)", has("GMAIL_USER") && has("GMAIL_APP_PASSWORD", 12), "Add GMAIL_USER and GMAIL_APP_PASSWORD in Vercel. Until then thank-you emails wait and nothing is sent.", "info"),
    c("retention", "Data kept for", true, `Names and answers are deleted ${env.RETENTION_DAYS || 7} days after a report link is used.`, "info"),
  ];
}
