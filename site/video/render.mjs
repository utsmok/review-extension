// Frame-by-frame renderer using Puppeteer + Remotion's bundle
// Bypasses the Rust compositor that hangs in WSL2

import { bundle } from "@remotion/bundler";
import { openBrowser, getCompositions } from "@remotion/renderer";
import { execSync } from "child_process";
import { mkdirSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entryPoint = join(__dirname, "src/index.ts");
const outputDir = join(__dirname, "out");
const framesDir = join(outputDir, "frames");

async function renderVideo(compositionId, outputFile) {
  console.log("Bundling...");
  const bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  console.log("Opening browser...");
  const browserInstance = await openBrowser("chrome-headless-shell", {
    shouldHaveGPU: false,
  });

  console.log("Getting compositions...");
  const compositions = await getCompositions(bundleLocation, {
    browserInstance,
    inputProps: {},
  });

  const composition = compositions.find((c) => c.id === compositionId);
  if (!composition) {
    throw new Error(
      `Composition ${compositionId} not found. Available: ${compositions.map((c) => c.id).join(", ")}`,
    );
  }

  const { durationInFrames, fps, width, height } = composition;
  console.log(`Rendering ${durationInFrames} frames at ${fps}fps (${width}x${height})...`);

  if (existsSync(framesDir)) rmSync(framesDir, { recursive: true });
  mkdirSync(framesDir, { recursive: true });

  const pages = await browserInstance.pages;
  const page = pages[0] || (await browserInstance.newPage());
  await page.setViewport({ width, height });

  const url = `${bundleLocation}/index.html?composition=${compositionId}`;
  await page.goto(url, { waitUntil: "networkidle0" });

  // Wait for React to hydrate
  await new Promise((r) => setTimeout(r, 1000));

  for (let frame = 0; frame < durationInFrames; frame++) {
    await page.evaluate((f) => {
      // Remotion's internal API for setting frame
      const container = document.getElementById("compositor");
      if (container) {
        container.setAttribute("data-frame", String(f));
      }
    }, frame);

    await new Promise((r) => setTimeout(r, 30));

    const frameFile = join(framesDir, `frame-${String(frame).padStart(5, "0")}.png`);
    await page.screenshot({ path: frameFile, type: "png" });

    if (frame % 30 === 0) {
      console.log(`  Frame ${frame}/${durationInFrames}`);
    }
  }

  await browserInstance.close();

  console.log("Stitching frames with ffmpeg...");
  const ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${join(framesDir, "frame-%05d.png")}" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 "${join(outputDir, outputFile)}"`;
  execSync(ffmpegCmd, { stdio: "inherit" });

  rmSync(framesDir, { recursive: true });
  console.log(`Done: ${outputFile}`);
}

const target = process.argv[2] || "both";

if (target === "both" || target === "explainer") {
  await renderVideo("TrustExplainer", "trust-explainer.mp4");
}
if (target === "both" || target === "walkthrough") {
  await renderVideo("ExtensionWalkthrough", "walkthrough.mp4");
}
