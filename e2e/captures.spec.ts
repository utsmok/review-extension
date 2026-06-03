import { createSession, expect, test } from "./helpers";

test.describe("Captures tab", () => {
  test("shows Quick Capture button when on Captures tab", async ({ sidePanel }) => {
    await createSession(sidePanel);

    // The Quick Capture button is in the toolbar (always visible)
    await expect(sidePanel.locator('[aria-label="Quick capture"]').first()).toBeVisible({
      timeout: 3000,
    });

    // Switch to Captures tab
    await sidePanel.keyboard.press("4");

    // Captures tab should be active
    await expect(sidePanel.getByRole("tab", { name: /Captures/, selected: true })).toBeVisible({
      timeout: 3000,
    });
  });
});
