import { describe, expect, it } from "vitest";
import { setupChecks } from "../lib/setupcheck";

const good = { NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k".repeat(40), ADMIN_PASSWORD: "p".repeat(16), CRON_SECRET: "c".repeat(32),
  NEXT_PUBLIC_SITE_URL: "https://stylecraft.vercel.app", GEMINI_API_KEY: "g".repeat(30) };
const fixes = (e: Record<string, string>) => setupChecks(e).filter((c) => c.status === "fix").map((c) => c.id);

describe("setup check", () => {
  it("passes a complete setup", () => expect(fixes(good)).toEqual([]));
  it("flags missing, short or unsafe settings", () => {
    expect(fixes({})).toEqual(expect.arrayContaining(["db-url", "db-key", "admin", "cron", "site"]));
    expect(fixes({ ...good, ADMIN_PASSWORD: "short" })).toEqual(["admin"]);
    expect(fixes({ ...good, DEV_MEMORY_DB: "true" })).toEqual(["dev-db"]);
    expect(fixes({ ...good, NEXT_PUBLIC_SITE_URL: "http://insecure.test" })).toEqual(["site"]);
  });
  it("never includes a setting's value in what it returns", () => {
    expect(JSON.stringify(setupChecks(good))).not.toContain("k".repeat(40));
    expect(JSON.stringify(setupChecks(good))).not.toContain("p".repeat(16));
  });
});
