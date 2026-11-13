import { NextResponse } from "next/server";
import { anonymousDb } from "@/lib/supabase";
import { feedbackSchema, saveFeedback } from "@/lib/feedback";

export async function POST(req: Request) {
  const parsed = feedbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const r = await saveFeedback(anonymousDb(), parsed.data);
    if (r === "not-found") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, already: r === "exists" });
  } catch {
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
}
