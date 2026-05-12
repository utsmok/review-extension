/**
 * Benchmark: measure the size of the exported ZIP blob.
 *
 * Run via: bash autoresearch.sh
 * Metric: METRIC zip_bytes=<value>
 */
import { describe, expect, it } from "vitest";
import { exportSession } from "@/lib/export";
import {
  makeMetadata,
  makeCapture,
  makeEvaluation,
  makeFinalization,
  RUBRIC,
  TINY_PNG,
} from "./fixtures/index";
import { v4 as uuid } from "uuid";

/**
 * Build a realistic ~150KB base64 PNG data URL.
 * Production screenshots from chrome.tabs.captureVisibleTab are typically
 * 200KB–2MB base64 PNGs. We synthesize one by taking the minimal valid PNG
 * and padding the IDAT chunk with compressed zero bytes to reach target size.
 */
function buildRealisticScreenshot(targetKB = 150): string {
  const targetBytes = targetKB * 1024;
  // TINY_PNG is ~68 bytes. We need a much larger image.
  // Generate a minimal uncompressed PNG with arbitrary pixel data.
  // 400x300 RGBA = 480,000 pixels = ~480KB raw → ~150KB as base64
  const width = 400;
  const height = 300;
  const channels = 4; // RGBA
  const rowSize = width * channels + 1; // +1 for filter byte per row
  const rawSize = rowSize * height;

  // Build raw pixel data with pseudo-random content (simulates a real screenshot)
  // Real screenshots compress poorly (photo-like content), unlike solid-color blocks.
  const rawData = new Uint8Array(rawSize);
  let seed = 12345;
  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0; // filter: None
    for (let x = 0; x < width * channels; x++) {
      // Simple LCG PRNG — produces varied but deterministic pixel data
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      rawData[y * rowSize + 1 + x] = seed & 0xff;
    }
  }

  // Deflate the raw data
  const compressed = deflateRawSync(rawData);

  // Build PNG file
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = buildIHDR(width, height);
  const idat = buildChunk("IDAT", compressed);
  const iend = buildChunk("IEND", new Uint8Array(0));

  const totalLen = signature.length + ihdr.length + idat.length + iend.length;
  const png = new Uint8Array(totalLen);
  let offset = 0;
  png.set(signature, offset);
  offset += signature.length;
  png.set(ihdr, offset);
  offset += ihdr.length;
  png.set(idat, offset);
  offset += idat.length;
  png.set(iend, offset);

  // Convert to base64
  let binary = "";
  for (let i = 0; i < png.length; i++) binary += String.fromCharCode(png[i]);
  return `data:image/png;base64,${btoa(binary)}`;
}

function buildIHDR(width: number, height: number): Uint8Array {
  const data = new Uint8Array(13);
  data[0] = (width >> 24) & 0xff;
  data[1] = (width >> 16) & 0xff;
  data[2] = (width >> 8) & 0xff;
  data[3] = width & 0xff;
  data[4] = (height >> 24) & 0xff;
  data[5] = (height >> 16) & 0xff;
  data[6] = (height >> 8) & 0xff;
  data[7] = height & 0xff;
  data[8] = 8; // bit depth
  data[9] = 6; // color type: RGBA
  data[10] = 0; // compression
  data[11] = 0; // filter
  data[12] = 0; // interlace
  return buildChunk("IHDR", data);
}

function buildChunk(type: string, data: Uint8Array): Uint8Array {
  const len = data.length;
  const chunk = new Uint8Array(12 + len);
  chunk[0] = (len >> 24) & 0xff;
  chunk[1] = (len >> 16) & 0xff;
  chunk[2] = (len >> 8) & 0xff;
  chunk[3] = len & 0xff;
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(data, 8);
  const crc = crc32(chunk.slice(4, 8 + len));
  chunk[8 + len] = (crc >> 24) & 0xff;
  chunk[9 + len] = (crc >> 16) & 0xff;
  chunk[10 + len] = (crc >> 8) & 0xff;
  chunk[11 + len] = crc & 0xff;
  return chunk;
}

function deflateRawSync(data: Uint8Array): Uint8Array {
  // Use Node's zlib for deflate
  const { deflateSync } = require("node:zlib");
  return deflateSync(data);
}

// CRC32 lookup table
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function buildSession() {
  const metadata = makeMetadata({ toolName: "Google Scholar" });
  const screenshot = buildRealisticScreenshot();

  const captures = [];
  for (let i = 0; i < 5; i++) {
    captures.push(
      makeCapture({
        id: uuid(),
        sourceUrl: `https://scholar.google.com/scholar?q=deep+learning&page=${i}`,
        pageTitle: `Deep Learning Results - Page ${i}`,
        screenshotBase64: screenshot,
        htmlContent: `<!DOCTYPE html><html><head><title>Page ${i}</title><style>body{font-family:sans-serif;margin:2em}h1{color:#333}.result{border-bottom:1px solid #ddd;padding:1em 0}.title{font-weight:bold}.snippet{color:#555}.url{color:green;font-size:0.9em}.nav{margin:2em 0}.nav a{margin-right:1em}.footer{margin-top:3em;color:#999;font-size:0.85em;border-top:1px solid #eee;padding-top:1em}</style></head><body><nav class="nav"><a href="?q=deep+learning">All</a><a href="?q=deep+learning&as_sdt=0,5">Articles</a></nav><h1>Scholar Results for "deep learning" — Page ${i}</h1>${Array.from({ length: 10 }, (_, j) => `<div class="result"><div class="title"><a href="https://papers.nips.cc/paper/${i * 10 + j}">Paper ${j}: Advances in Neural Information Processing Systems vol. ${i * 10 + j}</a></div><div class="url">papers.nips.cc › paper › ${i * 10 + j}</div><div class="snippet">We present a novel approach to deep reinforcement learning that achieves state-of-the-art results on multiple benchmark tasks including Atari games and continuous control problems.</div></div>`).join("")}<footer class="footer">About Google Scholar Privacy Terms</footer></body></html>`,
      }),
    );
  }

  const evaluations = [
    makeEvaluation({
      rubricId: "TR.data_source_clarity",
      score: 2,
      notes: "Multiple databases listed",
      explicitEvidenceIds: [captures[0].id],
    }),
    makeEvaluation({
      rubricId: "TR.search_method_transparency",
      score: 3,
      notes: "Boolean operators documented",
      explicitEvidenceIds: [captures[1].id, captures[2].id],
    }),
    makeEvaluation({
      rubricId: "TR.result_presentation",
      score: 1,
      notes: "Simple list",
      explicitEvidenceIds: [],
    }),
    makeEvaluation({
      rubricId: "SE.algorithmic_fairness",
      score: 2,
      notes: "No fairness info",
      explicitEvidenceIds: [captures[3].id],
    }),
    makeEvaluation({
      rubricId: "RE.variance_consistency",
      score: "na",
      notes: "N/A",
      explicitEvidenceIds: [],
    }),
    makeEvaluation({
      rubricId: "SE.index_coverage",
      score: 3,
      notes: "389M articles",
      explicitEvidenceIds: [captures[4].id],
    }),
  ];

  const finalization = makeFinalization({
    grade: "conditional",
    conclusion: "Good coverage but lacks ranking transparency.",
    strengths: ["Large index", "Good search operators"],
    weaknesses: ["Opaque ranking", "No API docs"],
    recommendations: "Supplement with manual verification.",
  });

  return { metadata, captures, evaluations, finalization };
}

describe("export size benchmark", () => {
  it("measures ZIP export size", async () => {
    const { metadata, captures, evaluations, finalization } = buildSession();
    const blob = await exportSession(metadata, captures, evaluations, RUBRIC, finalization);

    const screenshotsTotal = captures.reduce((sum, c) => sum + c.screenshotBase64.length, 0);
    const htmlTotal = captures.reduce((sum, c) => sum + c.htmlContent.length, 0);

    // Analyze per-entry compression
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    let pngCompressed = 0;
    let htmlCompressed = 0;
    let otherCompressed = 0;
    zip.forEach((_path, file) => {
      const d = (file as any)._data;
      if (!d) return;
      const comp = d.compressedSize ?? 0;
      const uncomp = d.uncompressedSize ?? 0;
      const ratio = uncomp ? ((comp / uncomp) * 100).toFixed(1) : "N/A";
      console.log(`  ${_path}: ${uncomp} → ${comp} (${ratio}%)`);
      if (_path.endsWith(".png")) pngCompressed += comp;
      else if (_path.endsWith(".html")) htmlCompressed += comp;
      else otherCompressed += comp;
    });

    console.log(`METRIC zip_bytes=${blob.size}`);
    console.log(`ASI screenshots_uncompressed=${screenshotsTotal}`);
    console.log(`ASI html_uncompressed=${htmlTotal}`);
    console.log(`ASI png_compressed=${pngCompressed}`);
    console.log(`ASI html_compressed=${htmlCompressed}`);
    console.log(`ASI other_compressed=${otherCompressed}`);
    console.log(`  Captures: ${captures.length}`);
    console.log(`  Evaluations: ${evaluations.length}`);

    expect(blob.size).toBeGreaterThan(1000);
  });
});
