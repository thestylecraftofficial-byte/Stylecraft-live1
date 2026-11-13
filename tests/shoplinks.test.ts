import { describe, expect, it } from "vitest";
import { affiliateHref, affiliateStatus, searchQuery, shopLinks } from "../lib/report/shoplinks";

describe("shop search links", () => {
  it("builds a plain search phrase and does not repeat the colour", () => {
    expect(searchQuery({ name: "Navy chinos", colour: "navy" }, "menswear")).toBe("navy chinos men");
    expect(searchQuery({ name: "Linen shirt", colour: "cream" }, "menswear")).toBe("cream linen shirt men");
    expect(searchQuery({ name: "Block-print kurti", colour: "royal-blue" }, "womenswear")).toBe("royal blue block print kurti women");
    expect(searchQuery({ name: "Tan kolhapuri", colour: "camel" })).toBe("camel tan kolhapuri");
  });
  it("makes one https search link per shop with the phrase safely encoded", () => {
    const l = shopLinks({ name: "Chinos & shorts", colour: "olive" }, "menswear");
    expect(l.map((x) => x.name)).toEqual(["Myntra", "Ajio", "Amazon", "Flipkart"]);
    for (const x of l) { expect(x.href.startsWith("https://")).toBe(true); expect(x.href).not.toContain(" "); expect(x.href).not.toContain("&shorts"); }
  });
});

describe("affiliate links", () => {
  const url = "https://www.amazon.in/s?k=navy%20chinos%20men";
  it("changes nothing until something is set", () => {
    expect(affiliateHref("amazon", url, {})).toEqual({ href: url, affiliate: false });
    expect(affiliateStatus({}).any).toBe(false);
  });
  it("adds the Amazon tag, and wraps other shops with the network template", () => {
    expect(affiliateHref("amazon", url, { AMAZON_ASSOCIATE_TAG: "stylecraft-21" })).toEqual({ href: url + "&tag=stylecraft-21", affiliate: true });
    const w = affiliateHref("myntra", "https://www.myntra.com/navy-chinos-men", { AFFILIATE_MYNTRA_TEMPLATE: "https://track.example/?cid=1&url={url}" });
    expect(w).toEqual({ href: "https://track.example/?cid=1&url=https%3A%2F%2Fwww.myntra.com%2Fnavy-chinos-men", affiliate: true });
    expect(affiliateStatus({ AMAZON_ASSOCIATE_TAG: "stylecraft-21", AFFILIATE_MYNTRA_TEMPLATE: "https://t.example/?u={url}" })).toMatchObject({ any: true, amazon: true, shops: ["Myntra", "Amazon"] });
  });
  it("ignores unsafe or malformed settings", () => {
    expect(affiliateHref("ajio", "https://a.test/", { AFFILIATE_AJIO_TEMPLATE: "http://evil.test/{url}" }).affiliate).toBe(false);
    expect(affiliateHref("ajio", "https://a.test/", { AFFILIATE_AJIO_TEMPLATE: "https://ok.test/no-placeholder" }).affiliate).toBe(false);
    expect(affiliateHref("amazon", url, { AMAZON_ASSOCIATE_TAG: "bad tag&x=1" }).affiliate).toBe(false);
  });
});
