import { createSession, expect, test } from "./helpers";

test.describe("Session persistence", () => {
  test("session survives page reload", async ({ sidePanel }) => {
    await createSession(sidePanel, "Persistent Tool");

    // Verify session is active
    await expect(sidePanel.getByRole("tab", { name: /Evaluation/ })).toBeVisible({
      timeout: 10000,
    });

    // Reload the sidepanel page
    await sidePanel.reload();
    await sidePanel.waitForLoadState("domcontentloaded");

    // After reload, the session should still be active
    // (auto-loaded from IndexedDB via session-lifecycle)
    await expect(sidePanel.getByRole("tab", { name: /Evaluation/ })).toBeVisible({
      timeout: 10000,
    });
    await expect(sidePanel.locator("text=Persistent Tool")).toBeVisible({ timeout: 5000 });
  });
});
