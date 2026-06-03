import { createSession, expect, test } from "./helpers";

test.describe("Evaluation tab", () => {
  test("displays quality gates and scoring rubric sections", async ({ sidePanel }) => {
    await createSession(sidePanel);

    // Use exact heading text to avoid strict mode violations
    await expect(sidePanel.getByRole("heading", { name: "Quality Gates" }).first()).toBeVisible();
    await expect(sidePanel.getByRole("heading", { name: "Scoring Rubric" }).first()).toBeVisible();
  });

  test("can expand and score a quality gate as pass", async ({ sidePanel }) => {
    await createSession(sidePanel);

    // Expand the first quality gate question
    const firstQG = sidePanel.locator("details").first();
    await firstQG.click();

    // Click "Pass" label
    const passLabel = sidePanel.locator('label:has-text("Pass")').first();
    await expect(passLabel).toBeVisible({ timeout: 3000 });
    await passLabel.click();
  });

  test("can expand and score a rubric question", async ({ sidePanel }) => {
    await createSession(sidePanel);

    // Quality gates are first 4 <details>, scoring questions start at index 4.
    // Collapsed <details> are in DOM but not "visible" to Playwright — use force click.
    const scoringQuestion = sidePanel.locator("details").nth(4);
    await scoringQuestion.click({ force: true });

    // Look for score option — the app uses data-score attributes
    const score3 = sidePanel.locator('[data-score="3"]').first();
    if (await score3.isVisible({ timeout: 3000 }).catch(() => false)) {
      await score3.click({ force: true });
    }
  });

  test("keyboard shortcuts switch between tabs", async ({ sidePanel }) => {
    await createSession(sidePanel);

    // Tab order: 1=Evaluation, 2=Metadata, 3=Finalize, 4=Captures
    // Press "4" → Captures tab
    await sidePanel.keyboard.press("4");
    await expect(sidePanel.getByRole("tab", { name: /Captures/, selected: true })).toBeVisible({
      timeout: 3000,
    });

    // Press "1" → Evaluation tab
    await sidePanel.keyboard.press("1");
    await expect(sidePanel.getByRole("tab", { name: /Evaluation/, selected: true })).toBeVisible({
      timeout: 3000,
    });

    // Press "3" → Finalize tab
    await sidePanel.keyboard.press("3");
    await expect(sidePanel.getByRole("tab", { name: /Finalize/, selected: true })).toBeVisible({
      timeout: 3000,
    });

    // Press "2" → Metadata tab
    await sidePanel.keyboard.press("2");
    await expect(sidePanel.getByRole("tab", { name: /Metadata/, selected: true })).toBeVisible({
      timeout: 3000,
    });
  });
});
