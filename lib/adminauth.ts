// Admin sign-in. A signed, expiring cookie replaces the browser's Basic-auth box.
// Works in both the Edge middleware and Node routes (Web Crypto only).
export const COOKIE = "sc_admin";
export const SESSION_HOURS = 12;

const enc = new TextEncoder();
async function hmac(secret: string, text: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode("stylecraft-admin|" + secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}
export function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// The token is "expiry.signature". It is signed with the admin password, so changing the password signs everyone out.
export async function makeToken(password: string, now = Date.now()) {
  const exp = String(now + SESSION_HOURS * 3_600_000);
  return `${exp}.${await hmac(password, exp)}`;
}
export async function checkToken(token: string | undefined | null, password: string | undefined, now = Date.now()) {
  if (!token || !password) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d{10,15}$/.test(exp) || Number(exp) <= now) return false;
  return same(sig, await hmac(password, exp));
}

// Lock-out after repeated wrong passwords. It lives in the server's memory, so on Vercel each running copy counts separately.
// It slows guessing a lot; a long password is still what protects you.
export function createLimiter(max = 5, lockMs = 15 * 60_000) {
  const fails = new Map<string, { n: number; until: number }>();
  return {
    locked(key: string, now = Date.now()) { const f = fails.get(key); return !!f && f.until > now; },
    fail(key: string, now = Date.now()) {
      const f = fails.get(key);
      const n = f && (f.until === 0 || f.until > now) ? f.n + 1 : 1;
      fails.set(key, { n, until: n >= max ? now + lockMs : 0 });
      if (fails.size > 2000) fails.clear();
    },
    ok(key: string) { fails.delete(key); },
  };
}
