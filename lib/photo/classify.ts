// Pure functions that turn face measurements into labels. The photo itself never leaves the device;
// only these labels are sent. Sizes are never inferred from a photo.
export type SkinDepth = "light" | "medium" | "tan" | "deep";
export type UndertoneHint = "warm" | "cool" | "neutral";
export type FaceShape = "oval" | "round" | "square" | "heart" | "oblong";

export const SKIN_DEPTHS: readonly SkinDepth[] = ["light", "medium", "tan", "deep"];
export const UNDERTONE_HINTS: readonly UndertoneHint[] = ["warm", "cool", "neutral"];
export const FACE_SHAPES: readonly FaceShape[] = ["oval", "round", "square", "heart", "oblong"];

type RGB = [number, number, number];

function srgbToLinear(c: number) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// sRGB (0-255) to CIE Lab (D65)
export function rgbToLab([r, g, b]: RGB): [number, number, number] {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

// Average skin colour from cheek/forehead samples -> depth and undertone hint.
export function classifySkin(rgb: RGB): { depth: SkinDepth; undertone: UndertoneHint } {
  const [L, a, b] = rgbToLab(rgb);
  const depth: SkinDepth = L >= 68 ? "light" : L >= 56 ? "medium" : L >= 43 ? "tan" : "deep";
  // Yellow-vs-red balance: higher b relative to a reads warm, lower reads cool.
  const hue = Math.atan2(b, a) * (180 / Math.PI);
  const undertone: UndertoneHint = hue >= 58 ? "warm" : hue <= 48 ? "cool" : "neutral";
  return { depth, undertone };
}

export type Pt = { x: number; y: number };
const dist = (p: Pt, q: Pt) => Math.hypot(p.x - q.x, p.y - q.y);

// Landmark indices from MediaPipe Face Landmarker (478-point mesh)
export const LM = { top: 10, chin: 152, foreheadL: 54, foreheadR: 284, cheekL: 234, cheekR: 454, jawL: 172, jawR: 397 } as const;

export function classifyFaceShape(pts: Pt[]): FaceShape {
  const length = dist(pts[LM.top], pts[LM.chin]);
  const cheek = dist(pts[LM.cheekL], pts[LM.cheekR]);
  const jaw = dist(pts[LM.jawL], pts[LM.jawR]);
  const forehead = dist(pts[LM.foreheadL], pts[LM.foreheadR]);
  return faceShapeFromRatios(length / cheek, jaw / cheek, forehead / cheek);
}

export function faceShapeFromRatios(lengthToWidth: number, jawToCheek: number, foreheadToCheek: number): FaceShape {
  if (lengthToWidth >= 1.45) return "oblong";
  if (foreheadToCheek > 0.95 && jawToCheek < 0.78) return "heart";
  if (lengthToWidth < 1.25 && jawToCheek >= 0.85) return "square";
  if (lengthToWidth < 1.3) return "round";
  return "oval";
}
