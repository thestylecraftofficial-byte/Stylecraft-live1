import { NextResponse } from "next/server";
import { intakeSchema } from "@/lib/schema";
import { saveIntake } from "@/lib/intake";
import { anonymousDb, identityDb, RETENTION_DAYS } from "@/lib/supabase";
import { consumeTestLink, recordUse } from "@/lib/testmode";
import { createPending } from "@/lib/report/load";

export async function POST(req: Request) {
  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Only a link made in /admin can start a report. No name or phone is collected; the link's label is used.
  let used: Awaited<ReturnType<typeof consumeTestLink>>;
  try { used = await consumeTestLink(identityDb(), String(body?.testCode ?? "")); }
  catch (e) {
    console.error("link check failed:", e instanceof Error ? e.message.split(":")[0] : "unknown");
    return NextResponse.json({ error: "We could not check your link just now. Please try again in a minute." }, { status: 503 });
  }
  if (!used.ok) {
    const msg = used.reason === "expired" ? "This link has expired." : used.reason === "used" ? "This link has already been used." : "This link is not valid.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
  const linkId = used.link.id, linkAttempts = used.link.attempts;
  body = { ...body, contact: { name: used.link.label, phone: "0000000000", email: "" } };

  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) {
    await giveBack(linkId, linkAttempts);
    const first = parsed.error.issues[0];
    // Name the field the person can see, not an internal key such as "value".
    const seg = first ? [...first.path].reverse().find((x) => typeof x === "string" && x !== "value" && x !== "unsure") : undefined;
    const where = seg ? String(seg).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase() : "";
    return NextResponse.json({ error: `Please check your answers${where ? ` (${where})` : ""} and try again. Your attempt was not used.` }, { status: 422 });
  }

  try {
    const identity = identityDb();
    const { profileId } = await saveIntake({ identity, anonymous: anonymousDb() }, parsed.data);
    await recordUse(identity, linkId, profileId);
    // Start the deletion clock now: there is no "delivered" step.
    await identity.from("links").update({ delete_after: new Date(Date.now() + RETENTION_DAYS * 86_400_000).toISOString() }).eq("profile_id", profileId);
    const token = await createPending(anonymousDb(), profileId, { tier: "report", testMode: true });
    return NextResponse.json({ ok: true, profileId, token });
  } catch (e) {
    await giveBack(linkId, linkAttempts);
    // Never echo database errors or personal details back to the browser or into logs.
    console.error("intake failed:", e instanceof Error ? e.message.split(":")[0] : "unknown");
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
}

// A failed save must not cost the person their attempt.
async function giveBack(linkId: string, attemptsAfter: number) {
  await identityDb().from("test_links").update({ attempts: attemptsAfter - 1 }).eq("id", linkId).eq("attempts", attemptsAfter);
}
