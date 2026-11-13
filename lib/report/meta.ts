import type { Report } from "./types";
export const reportId = (r: Report, token: string) => `SC-${r.generatedAt.slice(0, 7).replace("-", "")}-${token.replace(/[^A-Za-z0-9]/g, "").slice(0, 5).toUpperCase().padEnd(5, "X")}`;
export const reportDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
