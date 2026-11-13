import { NextResponse } from "next/server";
import { COOKIE, SESSION_HOURS, createLimiter, makeToken, same } from "@/lib/adminauth";

const limiter = createLimiter();
const back = (req: Request, code: string) => NextResponse.redirect(new URL(`/admin/login?e=${code}`, req.url), 303);

export async function POST(req: Request) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return new NextResponse("Admin is not configured", { status: 503 });
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (limiter.locked(ip)) return back(req, "lock");
  const given = String((await req.formData().catch(() => null))?.get("password") ?? "");
  if (!same(given, pw)) {
    limiter.fail(ip);
    await new Promise((r) => setTimeout(r, 500)); // slows down guessing
    return back(req, limiter.locked(ip) ? "lock" : "bad");
  }
  limiter.ok(ip);
  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
  res.cookies.set(COOKIE, await makeToken(pw), { httpOnly: true, sameSite: "strict", secure: new URL(req.url).protocol === "https:", path: "/", maxAge: SESSION_HOURS * 3600 });
  return res;
}
