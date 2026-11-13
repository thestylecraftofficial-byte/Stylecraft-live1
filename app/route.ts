import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

// The home page is the waitlist page in public/waitlist.html. Its social-preview links get this site's real address.
export async function GET(req: Request) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
  const html = (await readFile(path.join(process.cwd(), "public", "waitlist.html"), "utf8")).replaceAll("https://YOUR-SITE.netlify.app", site);
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" } });
}
