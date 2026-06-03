import { createSession, expect, test } from "./helpers";

test.describe("Session lifecycle", () => {
  test("shows session manager with Start New Review on first load", async ({ sidePanel }) => {
    await expect(sidePanel.locator("text=Start New Review")).toBeVisible();
    await expect(sidePanel.locator("text=TRUST Review")).toBeVisible();
  });

  test("creates a new review session and shows active tabs", async ({ sidePanel }) => {
    await createSession(sidePanel, "Test Search Tool");

    // Verify all four tabs are present (use role=tab to avoid strict mode issues)
    await expect(sidePanel.getByRole("tab", { name: /Evaluation/ })).toBeVisible();
    await expect(sidePanel.getByRole("tab", { name: /Metadata/ })).toBeVisible();
    await expect(sidePanel.getByRole("tab", { name: /Captures/ })).toBeVisible();
    await expect(sidePanel.getByRole("tab", { name: /Finalize/ })).toBeVisible();
  });

  test("closes session and returns to session manager", async ({ sidePanel }) => {
    await createSession(sidePanel, "Tool To Delete");

    // The close button is an X icon with aria-label="Close review"
    const closeBtn = sidePanel.locator('button[aria-label="Close review"]').first();
    await expect(closeBtn).toBeVisible({ timeout: 5000 });
    await closeBtn.click();

    // Should be back on session manager with the session card visible
    await expect(sidePanel.locator("text=Tool To Delete")).toBeVisible({ timeout: 5000 });
    // Delete the session — button is opacity-0 until hovered; use force click
    const deleteBtn = sidePanel.locator('button[title="Delete review"]').first();
    await deleteBtn.click({ force: true });

    // Back to empty session manager
    await expect(sidePanel.locator("text=Start New Review")).toBeVisible({ timeout: 5000 });
  });
});
