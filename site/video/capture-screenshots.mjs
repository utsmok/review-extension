/**
 * Screenshot capture script — loads the actual TRUST Review extension
 * in Chrome via Playwright, creates a session with fixture data,
 * and captures screenshots at each workflow step.
 *
 * Uses the same approach as e2e/helpers.ts:
 *   1. Launch Chrome with --load-extension
 *   2. Wait for service worker to get extension ID
 *   3. Open sidepanel.html as a full page
 *   4. Interact with the actual UI
 *   5. Take screenshots
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, "../../.output/chrome-mv3");
const OUT_DIR = path.resolve(__dirname, "public/screenshots");

// Ensure output directory exists
fs.mkdirSync(OUT_DIR, { recursive: true });

// Viewport size matching the sidepanel's natural width
const VIEWPORT = { width: 420, height: 720 };

async function getExtensionId(context) {
  // Wait for the service worker to register
  let sw = context.serviceWorkers()[0];
  if (!sw) {
    sw = await context.waitForEvent("serviceworker", { timeout: 5000 });
  }
  const match = sw.url().match(/^chrome-extension:\/\/([a-z]{32})\//);
  if (!match) throw new Error("Cannot resolve extension ID from service worker");
  return match[1];
}

async function createSession(page, toolName = "Elicit") {
  await page.click("text=Start New Review");
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  await dialog.locator('input[type="text"], input:not([type])').first().fill(toolName);
  await dialog.locator('input[type="url"]').fill("https://elicit.com");
  await dialog.locator('button[type="submit"]').click();
  // Wait for the active session to appear
  await page.getByRole("tab", { name: /Evaluation/ }).waitFor({ state: "visible", timeout: 10000 });
}

async function fillMetadata(page) {
  // Tab is already switched by the caller — just fill fields
  const tabpanel = page.locator("#panel-metadata");

  // Wait for fields to be visible
  await tabpanel.waitFor({ state: "visible", timeout: 5000 });

  // The tool name and URL are already pre-filled from session creation.
  // Fill description
  const descField = tabpanel.locator("textarea").first();
  if (await descField.isVisible()) {
    await descField.fill(
      "AI-powered research assistant that finds and summarizes academic papers.",
    );
  }

  // Select a discipline — click the first option in the dropdown
  const disciplineSelect = tabpanel.locator("select").first();
  if (await disciplineSelect.isVisible()) {
    await disciplineSelect.selectOption({ label: "Multidisciplinary" });
  }

  // Wait a moment for autosave
  await page.waitForTimeout(500);
}

async function scoreSomeQuestions(page) {
  // Switch to Evaluation tab (keyboard shortcut "1")
  await page.keyboard.press("1");
  await page.getByRole("tab", { name: /Evaluation/, selected: true }).waitFor({ timeout: 3000 });

  const allQuestions = page.locator("details.question-details");
  await allQuestions.first().waitFor({ state: "visible", timeout: 5000 });

  // Score quality gates as "Pass" — expand and click
  // There are 6 quality gates (PS1, PS2, IP1, AC1, SE2, TC1 based on the rubric)
  const qualityGateCount = Math.min(6, await allQuestions.count());

  for (let i = 0; i < qualityGateCount; i++) {
    const qg = allQuestions.nth(i);
    await qg.locator("> summary").click();
    await page.waitForTimeout(200);

    // Click "Pass" label within this question
    const passBtn = qg.locator('label:has-text("Pass")').first();
    if (await passBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await passBtn.click();
    }
    await page.waitForTimeout(100);
  }

  // Score scoring rubric questions (start after quality gates)
  // We'll score a few to make the evaluation look realistic
  const scoringStart = qualityGateCount;
  const scoringEnd = Math.min(scoringStart + 6, await allQuestions.count());

  for (let i = scoringStart; i < scoringEnd; i++) {
    const q = allQuestions.nth(i);
    await q.locator("> summary").click();
    await page.waitForTimeout(200);

    // Score with varying values for visual interest
    const scores = [3, 2, 3, 1, 2, 3];
    const targetScore = String(scores[(i - scoringStart) % scores.length]);
    const scoreBtn = q.locator(`.score-row[data-score="${targetScore}"]`).first();
    if (await scoreBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await scoreBtn.click();
    }
    await page.waitForTimeout(100);
  }

  // Wait for score animations
  await page.waitForTimeout(500);
}

async function finalizeReview(page) {
  // Click the Finalize tab button directly
  await page.locator('button[role="tab"]:has-text("Finalize")').click();
  await page.waitForTimeout(500);

  const tabpanel = page.locator("#panel-finalize");

  // Click "Pass" grade button
  const passGrade = tabpanel.locator('button:has-text("Pass")').first();
  await passGrade.waitFor({ state: "visible", timeout: 5000 });
  await passGrade.click();
  await page.waitForTimeout(300);

  // Fill conclusion
  const conclusionArea = tabpanel.locator("textarea").first();
  await conclusionArea.waitFor({ state: "visible", timeout: 5000 });
  await conclusionArea.fill(
    "Elicit demonstrates strong transparency and usability for an AI-powered research tool. Recommended for academic use with awareness of identified limitations.",
  );

  // Fill a strength
  const strengthInput = tabpanel
    .locator(
      'input[placeholder*="trength"], input[placeholder*="Strength"], input[placeholder*="strength"]',
    )
    .first();
  if (await strengthInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await strengthInput.fill("Clear source attribution");
    await strengthInput.press("Enter");
    await page.waitForTimeout(200);
  }

  // Save
  const saveBtn = tabpanel
    .locator('button:has-text("Save"), button:has-text("Save Finalization")')
    .first();
  if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(1000);
  }
}

async function main() {
  console.log("Launching Chrome with extension...");
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    viewport: VIEWPORT,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--no-sandbox",
    ],
  });

  const extensionId = await getExtensionId(context);
  console.log(`Extension ID: ${extensionId}`);

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000); // Let React hydrate

  // ── Screenshot 1: Start screen ──────────────────────────────────────
  console.log("Capturing: start-screen");
  await page.screenshot({
    path: path.join(OUT_DIR, "start-screen.png"),
  });

  // ── Create session and capture each step ────────────────────────────
  await createSession(page);
  await page.waitForTimeout(500);

  // ── Screenshot 2: Evaluation tab (empty) ────────────────────────────
  console.log("Capturing: evaluation-empty");
  await page.screenshot({
    path: path.join(OUT_DIR, "evaluation-empty.png"),
  });

  // ── Score questions ─────────────────────────────────────────────────
  await scoreSomeQuestions(page);

  // ── Screenshot 3: Evaluation tab (scored) ───────────────────────────
  console.log("Capturing: evaluation-scored");
  await page.screenshot({
    path: path.join(OUT_DIR, "evaluation-scored.png"),
  });

  // ── Fill metadata ───────────────────────────────────────────────────
  await page.locator('button[role="tab"]:has-text("Metadata")').click();
  await page.waitForTimeout(300);
  await fillMetadata(page);

  // ── Screenshot 4: Metadata tab ──────────────────────────────────────
  console.log("Capturing: metadata");
  await page.screenshot({
    path: path.join(OUT_DIR, "metadata.png"),
  });

  // ── Finalize ────────────────────────────────────────────────────────
  await finalizeReview(page);
  // ── Screenshot 5: Finalization tab ──────────────────────────────────
  // ── Screenshot 5: Finalization tab ──────────────────────────────────
  console.log("Capturing: finalization");
  await page.screenshot({
    path: path.join(OUT_DIR, "finalization.png"),
  });

  // ── Switch back to evaluation for the scored view ───────────────────
  await page.locator('button[role="tab"]:has-text("Evaluation")').click();
  await page.waitForTimeout(500);

  // ── Screenshot 6: Top bar with completion state ─────────────────────
  console.log("Capturing: topbar");
  // Zoom out a bit to show the full header
  await page.screenshot({
    path: path.join(OUT_DIR, "topbar.png"),
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: 100 },
  });

  await context.close();
  console.log(`\nAll screenshots saved to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
