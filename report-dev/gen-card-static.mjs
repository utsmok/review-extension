import { createServer } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const server = await createServer({
  root: __dirname,
  resolve: { alias: { "@": resolve(__dirname, "..") } },
  server: { middlewareMode: true },
  logLevel: "error",
  appType: "custom",
});

try {
  const mod = await server.ssrLoadModule("@/lib/html-report.ts");
  const trustFull = JSON.parse(
    await readFile(resolve(__dirname, "..", "data/rubrics/trust-full.json"), "utf-8"),
  );
  const session = JSON.parse(await readFile(resolve(__dirname, "example-session.json"), "utf-8"));

  const fullDoc = await mod.buildBusinessCardLabel(
    session.metadata,
    session.evaluations,
    trustFull,
    session.finalization,
  );

  // Extract CSS from <style> tag
  const cssMatch = fullDoc.match(/<style>([\s\S]*?)<\/style>/);
  const cardCss = cssMatch ? cssMatch[1] : "";

  // Extract the main content (both cards)
  const mainMatch = fullDoc.match(/<main id="report-content">([\s\S]*?)<\/main>/);
  const mainContent = mainMatch ? mainMatch[1].trim() : "";

  // Split into individual cards at the second .bc-card
  const firstCardStart = mainContent.indexOf('<div class="bc-card');
  const secondCardStart = mainContent.indexOf('<div class="bc-card', firstCardStart + 1);

  const frontCard =
    secondCardStart > -1 ? mainContent.substring(0, secondCardStart).trim() : mainContent;
  const backCard = secondCardStart > -1 ? mainContent.substring(secondCardStart).trim() : "";

  const escHtml = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const staticHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>TRUST Card — Real Example Data</title>
<style>
  body { margin: 0; padding: 24px; background: #eef0f3; font-family: system-ui, sans-serif; }
  h1 { font-size: 16px; color: #333; margin-bottom: 2px; }
  p.sub { font-size: 12px; color: #888; margin-top: 0; margin-bottom: 20px; }
  .card-stage { display: flex; gap: 32px; flex-wrap: wrap; }
  .card-slot { display: flex; flex-direction: column; gap: 6px; }
  .card-slot h3 { font-size: 11px; color: #555; margin: 0; }
  .card-slot .bc-card { transform: scale(2.5); transform-origin: top left; }
  .card-slot .card-holder { width: 210mm; height: 131mm; overflow: hidden; }

${cardCss}
</style>
</head>
<body>
<h1>TRUST Business Card — ${escHtml(session.metadata.toolName)} (Real Export Data)</h1>
<p class="sub">From <code>.example_data/</code> · pick any element to iterate with Impeccable</p>
<div id="cards">
  <div class="card-stage">
    <div class="card-slot">
      <h3>FRONT</h3>
      <div class="card-holder">
${frontCard}
      </div>
    </div>
    <div class="card-slot">
      <h3>BACK</h3>
      <div class="card-holder">
${backCard}
      </div>
    </div>
  </div>
</div>
</body>
</html>`;

  await writeFile(resolve(__dirname, "example-card.html"), staticHtml);
  console.log(`Written static card HTML (${staticHtml.length} bytes)`);
  console.log(`Front card: ${frontCard.length} bytes, Back card: ${backCard.length} bytes`);
} catch (err) {
  console.error("Error:", err);
  process.exitCode = 1;
} finally {
  await server.close();
}
