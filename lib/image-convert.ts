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
  maxDimension?: number,
): Promise<{ dataUrl: string; extension: "jpg" | "png" }> {
  if (!dataUrl.startsWith("data:image/png;base64,")) {
    return { dataUrl, extension: "png" };
  }

  // Try browser canvas path
  try {
    const result = await canvasConvert(dataUrl, quality, maxDimension);
    if (result) return { dataUrl: result, extension: "jpg" };
  } catch {
    // canvas not available, fall through
  }

  // Try Node pngjs + jpeg-js path
  try {
    const result = await nodeConvert(dataUrl, quality, maxDimension);
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

async function canvasConvert(
  dataUrl: string,
  quality: number,
  maxDimension?: number,
): Promise<string | null> {
  if (typeof Image === "undefined") return null;
  if (typeof document === "undefined") return null;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });

  let w = img.width;
  let h = img.height;
  if (maxDimension && Math.max(w, h) > maxDimension) {
    const scale = maxDimension / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

/* ── Node path (cached dynamic imports) ──────────────────────────────────── */
let _pngjs: typeof import("pngjs") | null = null;
let _jpegEncode:
  | ((
      input: { data: Uint8Array; width: number; height: number },
      quality?: number,
    ) => { data: Uint8Array; width: number; height: number })
  | null = null;

async function nodeConvert(
  dataUrl: string,
  quality: number,
  maxDimension?: number,
): Promise<string | null> {
  if (!_pngjs) _pngjs = await import("pngjs");
  if (!_jpegEncode) _jpegEncode = (await import("jpeg-js")).encode;
  const pngjs = _pngjs;
  // biome-ignore lint/style/noNonNullAssertion: guaranteed non-null by preceding guard
  const encode = _jpegEncode!;

  const raw = extractBase64(dataUrl);
  const pngBuffer =
    typeof Buffer !== "undefined"
      ? Buffer.from(raw, "base64")
      : BufferFrom(base64ToUint8Array(raw));
  const png = pngjs.PNG.sync.read(pngBuffer);

  let w = png.width;
  let h = png.height;
  let data: Uint8Array = png.data;

  if (maxDimension && Math.max(w, h) > maxDimension) {
    const scale = maxDimension / Math.max(w, h);
    const nw = Math.round(w * scale);
    const nh = Math.round(h * scale);
    // Pre-compute source coordinates to eliminate divisions from inner loop
    const nd = new Uint8Array(nw * nh * 4);
    // Pooled Buffers may have non-4-byte-aligned byteOffset; copy to aligned view if needed
    const srcBytes = png.data.byteOffset % 4 === 0 ? png.data : new Uint8Array(png.data);
    const src32 = new Uint32Array(srcBytes.buffer, srcBytes.byteOffset, srcBytes.length >>> 2);
    const dst32 = new Uint32Array(nd.buffer, nd.byteOffset, nd.length >>> 2);
    const colMap = new Int32Array(nw);
    for (let x = 0; x < nw; x++) colMap[x] = Math.round(x / scale);
    const rowMap = new Int32Array(nh);
    for (let y = 0; y < nh; y++) rowMap[y] = Math.round(y / scale) * w;
    for (let y = 0; y < nh; y++) {
      const srcRow = rowMap[y];
      for (let x = 0; x < nw; x++) {
        dst32[y * nw + x] = src32[srcRow + colMap[x]];
      }
    }
    w = nw;
    h = nh;
    data = nd;
  }

  const jpegResult = encode({ data, width: w, height: h }, quality);

  const jpegBase64 = uint8ArrayToBase64(jpegResult.data);
  return `data:image/jpeg;base64,${jpegBase64}`;
}

/** Portable base64 decode — uses Buffer when available for native speed. */
export function base64ToUint8Array(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(b64, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  }
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

/** Portable base64 encode — uses Buffer when available for native speed. */
export function uint8ArrayToBase64(arr: Uint8Array): string {
  if (typeof Buffer !== "undefined")
    return Buffer.from(arr.buffer, arr.byteOffset, arr.length).toString("base64");
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}
