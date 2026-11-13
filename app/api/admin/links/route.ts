import { NextResponse } from "next/server";
import { z } from "zod";
import { identityDb } from "@/lib/supabase";
import { createTestLink } from "@/lib/testmode";

const form = z.object({ label: z.string().trim().max(80).optional(), note: z.string().trim().max(300).optional() });

// Behind the admin password. One click makes a 24-hour link; the name and note are optional.
export async function POST(req: Request) {
  const parsed = form.safeParse(Object.fromEntries(await req.formData()));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const link = await createTestLink(identityDb(), parsed.data);
    return NextResponse.redirect(new URL(`/admin?tab=links&new=${link.code}`, req.url), 303);
  } catch (e) {
    console.error("create link failed:", e instanceof Error ? e.message.split(":")[0] : "unknown");
    return NextResponse.redirect(new URL("/admin?tab=links&err=link", req.url), 303);
  }
}
