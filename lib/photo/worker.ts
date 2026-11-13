/// <reference lib="webworker" />
// Runs MediaPipe Face Landmarker in a web worker. Receives an ImageBitmap, returns labels only.
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { classifyFaceShape, classifySkin, type Pt } from "./classify";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let landmarker: FaceLandmarker | null = null;
async function getLandmarker() {
  if (!landmarker) {
    const files = await FilesetResolver.forVisionTasks(WASM_BASE);
    landmarker = await FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL_URL },
      runningMode: "IMAGE",
      numFaces: 2,
    });
  }
  return landmarker;
}

// cheeks and forehead centre, as landmark indices
const SKIN_POINTS = [50, 280, 9];

self.onmessage = async (e: MessageEvent<{ bitmap: ImageBitmap }>) => {
  const { bitmap } = e.data;
  try {
    const lm = await getLandmarker();
    const result = lm.detect(bitmap);
    if (result.faceLandmarks.length === 0) return post({ ok: false, reason: "no-face" });
    if (result.faceLandmarks.length > 1) return post({ ok: false, reason: "many-faces" });
    const pts: Pt[] = result.faceLandmarks[0].map((p) => ({ x: p.x * bitmap.width, y: p.y * bitmap.height }));

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    let r = 0, g = 0, b = 0, n = 0;
    const half = Math.max(3, Math.round(bitmap.width * 0.012));
    for (const i of SKIN_POINTS) {
      const { data } = ctx.getImageData(Math.round(pts[i].x) - half, Math.round(pts[i].y) - half, half * 2, half * 2);
      for (let k = 0; k < data.length; k += 4) { r += data[k]; g += data[k + 1]; b += data[k + 2]; n++; }
    }
    const skin = classifySkin([r / n, g / n, b / n]);
    post({ ok: true, skinDepth: skin.depth, undertoneHint: skin.undertone, faceShape: classifyFaceShape(pts) });
  } catch {
    post({ ok: false, reason: "failed" });
  } finally {
    bitmap.close();
  }
};
function post(m: unknown) { (self as unknown as Worker).postMessage(m); }
