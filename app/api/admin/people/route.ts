import { NextResponse } from "next/server";
import { identityDb } from "@/lib/supabase";
import { deletePerson, setStylistStatus } from "@/lib/people";

// Behind the admin sign-in. Change a stylist's status, or delete a waitlist or stylist entry.
export async function POST(req: Request) {
  const f = await req.formData();
  const id = String(f.get("id") ?? ""), action = String(f.get("action") ?? ""), kind = String(f.get("kind") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    if (action === "status") await setStylistStatus(identityDb(), id, String(f.get("status") ?? ""));
    else if (action === "delete" && (kind === "waitlist" || kind === "stylist")) await deletePerson(identityDb(), kind, id);
    else return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  return NextResponse.redirect(new URL(`/admin?tab=${kind === "waitlist" ? "waitlist" : "stylists"}`, req.url), 303);
}
