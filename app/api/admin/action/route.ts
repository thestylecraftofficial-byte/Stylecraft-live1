import { NextResponse } from "next/server";
import { z } from "zod";
import { anonymousDb } from "@/lib/supabase";
import { answerCheck } from "@/lib/check/service";

const form = z.object({ action: z.literal("answer-check"), checkId: z.string().uuid(), feedback: z.string().min(10).max(1500) });

// Behind the admin password (see middleware.ts).
export async function POST(req: Request) {
  const data = Object.fromEntries(await req.formData());
  const parsed = form.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await answerCheck(anonymousDb(), parsed.data.checkId, parsed.data.feedback);
  return NextResponse.redirect(new URL("/admin?tab=checks", req.url), 303);
}
