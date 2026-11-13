import { NextResponse } from "next/server";
import { identityDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// A quick "is the site alive and can it reach its database" check, for you or an uptime monitor. Shows no data and no secrets.
export async function GET() {
  try {
    const { error } = await identityDb().from("test_links").select("id");
    if (error) throw new Error("db");
    return NextResponse.json({ ok: true, db: true });
  } catch {
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }
}
