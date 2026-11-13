import { createLimiter } from "./adminauth";
// Public forms: a few sends per visitor per window. In-memory, so each server copy counts separately; the hidden field and the unique phone number do the rest.
export const formLimiter = createLimiter(5, 30 * 60_000);
export const visitorKey = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
