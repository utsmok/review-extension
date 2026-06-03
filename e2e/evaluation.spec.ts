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
    const firstQG = sidePanel.locator("details.question-details").first();
    await firstQG.locator("> summary").click();

    // Click "Pass" label
    const passLabel = sidePanel.locator('label:has-text("Pass")').first();
    await expect(passLabel).toBeVisible({ timeout: 3000 });
    await passLabel.click();
  });

  test("can expand and score a rubric question", async ({ sidePanel }) => {
    await createSession(sidePanel);

    // There are 6 quality gates (PS1, PS2, IP1, AC1, SE2, TC1), scoring questions start at index 6.
    const allQuestions = sidePanel.locator("details.question-details");
    await expect(allQuestions.first()).toBeVisible({ timeout: 5000 });

    // Click the first scoring question (TR1 — Data source clarity)
    const scoringQuestion = allQuestions.nth(6);
    await scoringQuestion.locator("> summary").click();

    // Score options should now be visible (score-row with data-score)
    const score3 = scoringQuestion.locator('.score-row[data-score="3"]').first();
    await expect(score3).toBeVisible({ timeout: 3000 });
    await score3.click();
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
