/* eslint-disable @typescript-eslint/no-explicit-any */
// An in-memory stand-in for Supabase, for running the whole app on a laptop with no setup.
// Switched on by DEV_MEMORY_DB=true and refused in production. Data disappears when the server restarts.
type Row = Record<string, any>;
type Store = { tables: Map<string, Row[]>; files: Map<string, Uint8Array> };

const g = globalThis as unknown as { __memdb?: Store };
const store = (): Store => (g.__memdb ??= { tables: new Map(), files: new Map() });

const UNIQUE: Record<string, string[]> = { "anonymous.reports": ["profile_id"], "identity.links": ["customer_id", "profile_id"], "identity.test_links": ["code"], "identity.test_link_uses": ["profile_id"], "identity.waitlist": ["phone", "email"], "identity.stylist_applications": ["phone"] };
const DEFAULTS: Record<string, () => Row> = {
  "anonymous.reports": () => ({ status: "pending", checks_used: 0, needs_review: false, tier: "report", attempts: 0, retry_after: null, test_mode: false, created_at: new Date().toISOString() }),
  "anonymous.outfit_checks": () => ({ status: "pending", created_at: new Date().toISOString() }),
  "anonymous.outfit_feedback": () => ({ created_at: new Date().toISOString() }),
  "anonymous.profiles": () => ({ created_at: new Date().toISOString() }),
  "identity.customers": () => ({ created_at: new Date().toISOString() }),
  "identity.links": () => ({ report_delivered_at: null, delete_after: null }),
  "identity.waitlist": () => ({ created_at: new Date().toISOString(), mail_status: "pending", mail_sent_at: null, mail_tries: 0 }),
  "identity.stylist_applications": () => ({ status: "new", created_at: new Date().toISOString() }),
  "identity.test_links": () => ({ attempts: 0, max_attempts: 2, created_at: new Date().toISOString() }),
  "identity.test_link_uses": () => ({ created_at: new Date().toISOString() }),
};

function table(name: string): Row[] {
  const s = store();
  if (!s.tables.has(name)) s.tables.set(name, []);
  return s.tables.get(name)!;
}

class Query {
  private filters: ((r: Row) => boolean)[] = [];
  private op: "select" | "insert" | "update" | "delete" = "select";
  private payload: any; private wantRows = false; private sort?: { col: string; asc: boolean };
  constructor(private name: string) {}

  select() { if (this.op === "select") this.op = "select"; else this.wantRows = true; return this; }
  insert(v: Row | Row[]) { this.op = "insert"; this.payload = v; return this; }
  update(v: Row) { this.op = "update"; this.payload = v; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: any) { this.filters.push((r) => r[c] === v); return this; }
  lt(c: string, v: any) { this.filters.push((r) => r[c] < v); return this; }
  in(c: string, vs: any[]) { this.filters.push((r) => vs.includes(r[c])); return this; }
  order(col: string, o: { ascending?: boolean } = {}) { this.sort = { col, asc: o.ascending !== false }; return this; }
  async single() { const r = await this.run(); const rows = (r.data as Row[]) ?? []; return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: "no single row" } }; }
  async maybeSingle() { const r = await this.run(); return { data: ((r.data as Row[]) ?? [])[0] ?? null, error: r.error }; }
  then(ok: any, bad: any) { return this.run().then(ok, bad); }

  private async run(): Promise<{ data: Row[] | null; error: any }> {
    const rows = table(this.name);
    const match = (r: Row) => this.filters.every((f) => f(r));
    if (this.op === "insert") {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      const made: Row[] = [];
      for (const it of items) {
        const row = { id: crypto.randomUUID(), ...(DEFAULTS[this.name]?.() ?? {}), ...it };
        for (const col of UNIQUE[this.name] ?? []) {
          if (row[col] != null && rows.some((x) => x[col] === row[col])) return { data: null, error: { code: "23505", message: "duplicate key" } };
        }
        rows.push(row); made.push(row);
      }
      return { data: made, error: null };
    }
    if (this.op === "update") {
      const hit = rows.filter(match);
      hit.forEach((r) => Object.assign(r, this.payload));
      return { data: hit, error: null };
    }
    if (this.op === "delete") {
      const s = store(); const keep = rows.filter((r) => !match(r));
      s.tables.set(this.name, keep);
      return { data: null, error: null };
    }
    let out = rows.filter(match);
    if (this.sort) { const { col, asc } = this.sort; out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1)); }
    return { data: out.map((r) => ({ ...r })), error: null };
  }
}

function runDeletion(days: number) {
  const now = new Date().toISOString();
  const checks = table("anonymous.outfit_checks");
  const due = checks.filter((c) => c.delete_after <= now);
  const photos = due.map((c) => c.storage_path);
  store().tables.set("anonymous.outfit_checks", checks.filter((c) => c.delete_after > now));
  const links = table("identity.links"); const dueLinks = links.filter((l) => l.delete_after && l.delete_after <= now);
  const ids = new Set(dueLinks.map((l) => l.customer_id));
  store().tables.set("identity.links", links.filter((l) => !ids.has(l.customer_id)));
  const cust = table("identity.customers");
  store().tables.set("identity.customers", cust.filter((c) => !ids.has(c.id)));
  const remaining = new Set(table("identity.links").map((l) => l.profile_id));
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const profiles = table("anonymous.profiles");
  const gone = profiles.filter((p) => p.keep_anonymous === false && !remaining.has(p.id) && p.created_at <= cutoff);
  store().tables.set("anonymous.profiles", profiles.filter((p) => !gone.includes(p)));
  return [{ customers_deleted: ids.size, links_deleted: dueLinks.length, photos_due: photos, unconsented_profiles_deleted: gone.length }];
}

export function memoryClient(schema: "identity" | "anonymous"): any {
  return {
    from: (t: string) => new Query(`${schema}.${t}`),
    rpc: async (fn: string, args: any) => (fn === "run_deletion" ? { data: runDeletion(args?.retention_days ?? 7), error: null } : { data: null, error: { message: "not supported in memory mode" } }),
    storage: {
      from: () => ({
        upload: async (path: string, bytes: Uint8Array) => { store().files.set(path, bytes); return { error: null }; },
        remove: async (paths: string[]) => { paths.forEach((p) => store().files.delete(p)); return { error: null }; },
        createSignedUrl: async (path: string) => {
          const b = store().files.get(path);
          return { data: b ? { signedUrl: `data:image/jpeg;base64,${Buffer.from(b).toString("base64")}` } : null, error: null };
        },
      }),
    },
  };
}

export const memoryDbEnabled = () => process.env.DEV_MEMORY_DB === "true" && process.env.NODE_ENV !== "production";
