import { expect, test } from "./helpers";

test.describe("Import flow", () => {
  test("Import Review button is visible on session manager", async ({ sidePanel }) => {
    await expect(sidePanel.locator('button:has-text("Import Review")').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("file input for import exists", async ({ sidePanel }) => {
    const fileInput = sidePanel.locator('input[type="file"][accept=".zip"]');
    await expect(fileInput).toBeAttached({ timeout: 5000 });
  });
});
