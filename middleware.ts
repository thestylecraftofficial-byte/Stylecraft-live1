import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, checkToken } from "@/lib/adminauth";

// The founder pages need a signed-in session. If ADMIN_PASSWORD is not set, they stay closed.
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

export async function middleware(req: NextRequest) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return new NextResponse("Admin is not configured", { status: 503 });
  const p = req.nextUrl.pathname;
  if (p === "/admin/login" || p === "/api/admin/login") return NextResponse.next();
  if (await checkToken(req.cookies.get(COOKIE)?.value, pw)) return NextResponse.next();
  if (p.startsWith("/api/")) return new NextResponse("Sign in", { status: 401 });
  const url = req.nextUrl.clone(); url.pathname = "/admin/login"; url.search = "";
  return NextResponse.redirect(url);
}
