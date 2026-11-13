import { describe, expect, it } from "vitest";
import { saveIntake } from "@/lib/intake";
import { intakeSchema } from "@/lib/schema";
import { validIntake } from "./fixtures";

// Minimal in-memory stand-in for the Supabase query builder.
function fakeDb(failOn?: string) {
  const tables: Record<string, any[]> = {};
  const client: any = {
    tables,
    from(name: string) {
      tables[name] ??= [];
      return {
        insert(row: any) {
          if (failOn === name) return Object.assign(Promise.resolve({ error: { message: "boom" } }), { select: () => ({ single: async () => ({ data: null, error: { message: "boom" } }) }) });
          const stored = { id: row.id ?? `id-${tables[name].length + 1}`, ...row };
          tables[name].push(stored);
          return Object.assign(Promise.resolve({ error: null }), { select: () => ({ single: async () => ({ data: stored, error: null }) }) });
        },
        delete() { return { eq: async (k: string, v: any) => { tables[name] = tables[name].filter((r) => r[k] !== v); return { error: null }; } }; },
      };
    },
  };
  return client;
}

describe("saveIntake", () => {
  it("never puts name, phone or email in the anonymous store", async () => {
    const identity = fakeDb(), anonymous = fakeDb();
    await saveIntake({ identity, anonymous }, intakeSchema.parse(validIntake()));
    const anonJson = JSON.stringify(anonymous.tables);
    expect(anonJson).not.toContain("Test Person");
    expect(anonJson).not.toContain("9876543210");
    expect(anonJson).not.toContain("t@example.com");
    expect(identity.tables.customers).toHaveLength(1);
    expect(identity.tables.links).toHaveLength(1);
    expect(anonymous.tables.consent_log).toHaveLength(1);
  });
  it("rolls back earlier rows if the link cannot be written", async () => {
    const identity = fakeDb("links"), anonymous = fakeDb();
    await expect(saveIntake({ identity, anonymous }, intakeSchema.parse(validIntake()))).rejects.toThrow();
    expect(identity.tables.customers).toHaveLength(0);
    expect(anonymous.tables.profiles).toHaveLength(0);
  });
});
