import type { MetadataRoute } from "next";

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${site()}/`, lastModified: now, priority: 1 },
    { url: `${site()}/privacy.html`, lastModified: now, priority: 0.3 },
    { url: `${site()}/terms.html`, lastModified: now, priority: 0.3 },
  ];
}
