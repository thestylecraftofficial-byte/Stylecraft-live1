import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildReport } from "../lib/report/build";
import { renderPdf } from "../lib/report/pdf";
import { whatsappLink } from "../lib/admin";
import { profileSchema } from "../lib/schema";
import { validIntake } from "./fixtures";

describe("pdf and admin helpers", () => {
  it("renders a multi-section PDF from a report, including the rupee sign", async () => {
    const r = await buildReport(profileSchema.parse(validIntake().profile), async () => null);
    r.dontBuy[0].reason = "Costs over ₹5,000 and “doesn’t” fit";
    const bytes = await renderPdf(r);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
  });
  it("builds a WhatsApp link with India code for 10-digit numbers", () => {
    expect(whatsappLink("98765 43210", "Hi there")).toBe("https://wa.me/919876543210?text=Hi%20there");
    expect(whatsappLink("+91 98765 43210", "x")).toContain("wa.me/919876543210");
  });
});
