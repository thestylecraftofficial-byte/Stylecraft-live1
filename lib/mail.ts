import nodemailer from "nodemailer";

export const mailConfigured = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function thanksEmail(name: string) {
  const first = esc(name.trim().split(/\s+/)[0] || "there");
  const subject = "Thank you for showing interest in StyleCraft";
  const text = `Hi ${name.trim().split(/\s+/)[0] || "there"},\n\nThank you for showing interest in StyleCraft. You are on our list, and we will message you when we open.\n\nCraft Your Style. Own Your Story.\n\nStyleCraft, Hyderabad`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F4EFE6;">
<div style="display:none;max-height:0;overflow:hidden;">You are on the StyleCraft list. We will message you when we open.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EFE6;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:14px;overflow:hidden;">
<tr><td style="background:#111111;padding:30px 32px;text-align:center;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;letter-spacing:3px;color:#FFFFFF;">STYLE<span style="color:#C9A24B;">CRAFT</span></div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:#C9A24B;margin-top:8px;">CRAFT YOUR STYLE. OWN YOUR STORY.</div></td></tr>
<tr><td style="padding:36px 32px 8px;text-align:center;">
<div style="width:56px;height:56px;line-height:56px;border-radius:50%;background:#C9A24B;color:#FFFFFF;font-size:30px;margin:0 auto 18px;font-family:Arial,sans-serif;">&#10003;</div>
<h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;color:#111111;">Thank you for showing interest, ${first}.</h1>
<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#444444;">You are on the StyleCraft list. We are building a personal styling service for Indian wardrobes, bodies and occasions, and you will be among the first to hear when we open.</p>
<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#444444;">There is nothing more you need to do. We will message you when it is time.</p></td></tr>
<tr><td style="padding:22px 32px 34px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #E8E0D0;padding-top:20px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8A8372;">
StyleCraft &middot; Hyderabad<br>You received this because you joined our waitlist. To be removed, just reply to this email.</td></tr></table></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

export type SendResult = "sent" | "limit" | "error";

// Gmail refuses mail once the daily sending limit is used up. That is reported as "limit" so the caller can try again tomorrow.
export function isLimitError(e: unknown) {
  const x = e as { responseCode?: number; response?: string; message?: string };
  const t = `${x?.response ?? ""} ${x?.message ?? ""}`;
  return /5\.4\.5|daily user sending|sending limit|quota|rate limit|too many/i.test(t) || x?.responseCode === 421 || x?.responseCode === 450 || x?.responseCode === 452;
}

export async function sendThanks(to: string, name: string, transport = defaultTransport()): Promise<SendResult> {
  const m = thanksEmail(name);
  try {
    await transport.sendMail({ from: `StyleCraft <${process.env.GMAIL_USER}>`, to, replyTo: process.env.GMAIL_USER, subject: m.subject, text: m.text, html: m.html });
    return "sent";
  } catch (e) {
    console.error("thank-you email failed:", isLimitError(e) ? "limit" : "error");
    return isLimitError(e) ? "limit" : "error";
  }
}

export type Transport = { sendMail: (o: Record<string, unknown>) => Promise<unknown> };
function defaultTransport(): Transport {
  return nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
}
