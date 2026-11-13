import { NextResponse } from "next/server";
import { z } from "zod";
import { anonymousDb } from "@/lib/supabase";
import { prepareReport } from "@/lib/report/load";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const body = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/) });

// Builds a pending report (or reports how long to wait). Safe to call repeatedly: only one attempt runs at a time.
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const r = await prepareReport(anonymousDb(), parsed.data.token);
    if (r.status === "unknown") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(r);
  } catch (e) {
    console.error("prepare failed:", e instanceof Error ? e.message.split(":")[0] : "unknown");
    return NextResponse.json({ status: "pending", waitSeconds: 15 });
  }
}
