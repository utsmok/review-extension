// @vitest-environment node
import { describe, expect, it } from "vitest";
import { base64ToUint8Array, pngToJpeg, uint8ArrayToBase64 } from "@/lib/image-convert";
import { TINY_PNG } from "@/tests/fixtures";

// ── base64ToUint8Array ─────────────────────────────────────────────────

describe("base64ToUint8Array", () => {
  it("decodes an empty string to an empty array", () => {
    expect(base64ToUint8Array("")).toEqual(new Uint8Array(0));
  });

  it("decodes known base64 to expected bytes", () => {
    // btoa("Hello") → "SGVsbG8="
    const result = base64ToUint8Array("SGVsbG8=");
    expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  it("decodes binary data (all byte values stable)", () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) bytes[i] = i;
    const b64 = uint8ArrayToBase64(bytes);
    expect(base64ToUint8Array(b64)).toEqual(bytes);
  });
});

// ── uint8ArrayToBase64 ─────────────────────────────────────────────────

describe("uint8ArrayToBase64", () => {
  it("encodes an empty array to an empty string", () => {
    expect(uint8ArrayToBase64(new Uint8Array(0))).toBe("");
  });

  it("encodes known bytes to expected base64", () => {
    expect(uint8ArrayToBase64(new Uint8Array([72, 101, 108, 108, 111]))).toBe("SGVsbG8=");
  });

  it("round-trips with base64ToUint8Array", () => {
    const original = new Uint8Array([0, 127, 255, 42, 100]);
    const encoded = uint8ArrayToBase64(original);
    expect(base64ToUint8Array(encoded)).toEqual(original);
  });

  it("handles large arrays without error", () => {
    const large = new Uint8Array(100_000);
    for (let i = 0; i < large.length; i++) large[i] = i % 256;
    const encoded = uint8ArrayToBase64(large);
    expect(encoded.length).toBeGreaterThan(0);
    expect(base64ToUint8Array(encoded)).toEqual(large);
  });
});

// ── pngToJpeg ──────────────────────────────────────────────────────────

describe("pngToJpeg", () => {
  it("passes through non-PNG data-URLs unchanged", async () => {
    const jpeg = "data:image/jpeg;base64,/9j/4AAQ";
    const result = await pngToJpeg(jpeg);
    expect(result.dataUrl).toBe(jpeg);
    expect(result.extension).toBe("png");
  });

  it("passes through arbitrary strings unchanged", async () => {
    const notAnImage = "hello world";
    const result = await pngToJpeg(notAnImage);
    expect(result.dataUrl).toBe(notAnImage);
    expect(result.extension).toBe("png");
  });

  it("converts a valid PNG data-URL to JPEG", async () => {
    const result = await pngToJpeg(TINY_PNG);
    expect(result.extension).toBe("jpg");
    expect(result.dataUrl).toMatch(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/);
    // Should differ from the original PNG data-URL
    expect(result.dataUrl).not.toBe(TINY_PNG);
  });

  it("converts at custom quality", async () => {
    const high = await pngToJpeg(TINY_PNG, 0.95);
    const low = await pngToJpeg(TINY_PNG, 0.1);
    // Both should be valid JPEG data-URLs
    expect(high.extension).toBe("jpg");
    expect(low.extension).toBe("jpg");
    expect(high.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    expect(low.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("respects maxDimension when image is larger than the limit", async () => {
    // TINY_PNG is 1x1, so maxDimension shouldn't affect it.
    // Build a small 4x4 PNG programmatically.
    const pngjs = await import("pngjs");
    const png = new pngjs.PNG({ width: 4, height: 4 });
    // Fill with opaque red pixels
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const i = (png.width * y + x) << 2;
        png.data[i] = 255;
        png.data[i + 1] = 0;
        png.data[i + 2] = 0;
        png.data[i + 3] = 255;
      }
    }
    const pngBuf = pngjs.PNG.sync.write(png);
    const b64 = uint8ArrayToBase64(pngBuf);
    const dataUrl = `data:image/png;base64,${b64}`;

    // Without maxDimension — full conversion
    const full = await pngToJpeg(dataUrl);
    expect(full.extension).toBe("jpg");

    // With maxDimension=2 — should downscale and still convert
    const downscaled = await pngToJpeg(dataUrl, 0.8, 2);
    expect(downscaled.extension).toBe("jpg");
    expect(downscaled.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("returns original when maxDimension is larger than image", async () => {
    // TINY_PNG is 1x1; maxDimension=100 is larger, so no resize
    const result = await pngToJpeg(TINY_PNG, 0.8, 100);
    expect(result.extension).toBe("jpg");
    expect(result.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  });
});
