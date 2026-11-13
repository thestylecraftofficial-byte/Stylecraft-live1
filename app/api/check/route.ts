import { NextResponse } from "next/server";
import { anonymousDb } from "@/lib/supabase";
import { submitCheck } from "@/lib/check/service";
import { MAX_BYTES } from "@/lib/check/image";

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;
const MESSAGES = {
  "not-found": [404, "We could not find your report."], "not-eligible": [403, "The outfit check comes with the full report."],
  "already-used": [409, "Your free outfit check has been used."], "bad-occasion": [400, "Please choose an occasion."],
  "too-big": [413, "That photo is too large. Try a smaller one."], "not-jpeg": [400, "Please upload a photo (JPEG)."], failed: [500, "Could not upload. Please try again."],
} as const;

export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const token = String(form.get("token") ?? ""), occasion = String(form.get("occasion") ?? ""), file = form.get("photo");
  if (!TOKEN.test(token) || !(file instanceof File)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (form.get("consent") !== "yes") return NextResponse.json({ error: "Please tick the consent box." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: MESSAGES["too-big"][1] }, { status: 413 });

  let r: Awaited<ReturnType<typeof submitCheck>>;
  try { r = await submitCheck(anonymousDb(), token, occasion, new Uint8Array(await file.arrayBuffer())); }
  catch (e) {
    console.error("check failed:", e instanceof Error ? e.message.split(":")[0] : "unknown");
    return NextResponse.json({ error: MESSAGES.failed[1] }, { status: 500 });
  }
  if (r.ok) return NextResponse.json({ ok: true });
  const [status, error] = MESSAGES[r.reason];
  return NextResponse.json({ error }, { status });
}
