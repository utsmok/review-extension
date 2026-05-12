/**
 * Convert a PNG data-URL to a JPEG data-URL at the given quality.
 *
 * Works in two environments:
 * 1. Browser: uses HTMLCanvasElement / Image (fast, no deps).
 * 2. Node (tests): uses pngjs + jpeg-js (pure JS, dev deps).
 *
 * Returns the original data-URL unchanged if conversion fails or the input
 * is not a PNG data-URL.
 */
export async function pngToJpeg(
  dataUrl: string,
  quality = 0.8,
): Promise<{ dataUrl: string; extension: "jpg" | "png" }> {
  if (!dataUrl.startsWith("data:image/png;base64,")) {
    return { dataUrl, extension: "png" };
  }

  // Try browser canvas path
  try {
    const result = await canvasConvert(dataUrl, quality);
    if (result) return { dataUrl: result, extension: "jpg" };
  } catch {
    // canvas not available, fall through
  }

  // Try Node pngjs + jpeg-js path
  try {
    const result = await nodeConvert(dataUrl, quality);
    if (result) return { dataUrl: result, extension: "jpg" };
  } catch {
    // pngjs / jpeg-js not available, fall through
  }

  return { dataUrl, extension: "png" };
}
/** Extract raw base64 payload from a data-URL. */
function extractBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

/* ── Browser path ─────────────────────────────────────────────────────── */

async function canvasConvert(dataUrl: string, quality: number): Promise<string | null> {
  if (typeof Image === "undefined") return null;
  if (typeof document === "undefined") return null;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
}

/* ── Node path ────────────────────────────────────────────────────────── */

async function nodeConvert(dataUrl: string, quality: number): Promise<string | null> {
  const pngjs = await import("pngjs");
  const { encode } = await import("jpeg-js");

  const raw = extractBase64(dataUrl);
  const pngBuffer = base64ToUint8Array(raw);
  const png = pngjs.PNG.sync.read(BufferFrom(pngBuffer));

  const jpegResult = encode({ data: png.data, width: png.width, height: png.height }, quality);

  const jpegBase64 = uint8ArrayToBase64(jpegResult.data);
  return `data:image/jpeg;base64,${jpegBase64}`;
}

/** Portable base64 decode — works without Buffer. */
function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/** Ensure we have a Buffer for pngjs (it requires Buffer input). */
function BufferFrom(data: Uint8Array): Buffer {
  // In Node, globalThis.Buffer is available. In jsdom, polyfill from uint8array.
  if (typeof Buffer !== "undefined") return Buffer.from(data);
  // Minimal: pngjs checks .length and reads indexed values — Uint8Array works.
  return data as unknown as Buffer;
}

/** Portable base64 encode — works without Buffer. */
function uint8ArrayToBase64(arr: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}
