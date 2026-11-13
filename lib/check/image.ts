// Outfit photos are checked and cleaned on the server before they are stored.
export const MAX_BYTES = 2_500_000;

export function isJpeg(b: Uint8Array) {
  return b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

// Removes metadata segments (EXIF incl. GPS, XMP, IPTC, comments) so no location or device data is stored.
// Keeps everything needed to display the picture.
export function stripJpegMetadata(b: Uint8Array): Uint8Array {
  if (!isJpeg(b)) throw new Error("not a jpeg");
  const out: number[] = [0xff, 0xd8];
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) throw new Error("bad jpeg");
    const marker = b[i + 1];
    if (marker === 0xff) { i++; continue; }                       // padding
    if (marker === 0xda) { for (let k = i; k < b.length; k++) out.push(b[k]); return Uint8Array.from(out); } // image data to the end
    if (marker === 0xd9) { out.push(0xff, 0xd9); return Uint8Array.from(out); }
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) throw new Error("bad jpeg");
    const drop = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe; // APP1..APP15 and comments; keep APP0 (JFIF)
    if (!drop) for (let k = i; k < i + 2 + len; k++) out.push(b[k]);
    i += 2 + len;
  }
  throw new Error("bad jpeg");
}

export function prepareUpload(bytes: Uint8Array): { ok: true; data: Uint8Array } | { ok: false; reason: "too-big" | "not-jpeg" } {
  if (bytes.length > MAX_BYTES) return { ok: false, reason: "too-big" };
  if (!isJpeg(bytes)) return { ok: false, reason: "not-jpeg" };
  try { return { ok: true, data: stripJpegMetadata(bytes) }; } catch { return { ok: false, reason: "not-jpeg" }; }
}
