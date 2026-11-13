import { describe, it, expect } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";

describe("search engine files", () => {
  it("keeps private areas out of search and lists the public pages", () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    for (const p of ["/admin", "/api/", "/r/", "/start", "/stylists"]) expect(rule.disallow).toContain(p);
    const urls = sitemap().map((x) => x.url);
    expect(urls.some((u) => u.endsWith("/privacy.html"))).toBe(true);
    expect(urls.some((u) => /\/(r|start|admin)/.test(u))).toBe(false);
  });
});
