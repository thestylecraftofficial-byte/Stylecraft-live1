import type { MetadataRoute } from "next";

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

// Only the home page and the legal pages are meant for search engines. Everything with a personal link or a password stays out.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/r/", "/start", "/stylists"] }],
    sitemap: `${site()}/sitemap.xml`,
  };
}
