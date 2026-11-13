import { NextResponse } from "next/server";
import { identityDb } from "@/lib/supabase";
import { addStylist, stylistSchema } from "@/lib/people";
import { formLimiter, visitorKey } from "@/lib/spam";

export async function POST(req: Request) {
  const key = "stylist:" + visitorKey(req);
  if (formLimiter.locked(key)) return NextResponse.json({ error: "Too many tries. Please try again later." }, { status: 429 });
  const body = await req.json().catch(() => null);
  const parsed = stylistSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  formLimiter.fail(key);
  if (parsed.data.website) return NextResponse.json({ ok: true });
  try { await addStylist(identityDb(), parsed.data); } catch { return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
