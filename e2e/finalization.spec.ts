import { createSession, expect, test } from "./helpers";

test.describe("Finalization tab", () => {
  test("displays grade selector with Pass, Conditional, Fail", async ({ sidePanel }) => {
    await createSession(sidePanel);

    // Tab order: 3 = Finalize
    await sidePanel.keyboard.press("3");

    // Verify Finalize tab is active
    await expect(sidePanel.getByRole("tab", { name: /Finalize/, selected: true })).toBeVisible({
      timeout: 3000,
    });

    // Grade buttons — scope to the active tabpanel to avoid matching Evaluation's "Pass" labels
    const tabpanel = sidePanel.getByRole("tabpanel", { name: /Finalize/ });
    await expect(tabpanel.locator("text=Pass").first()).toBeVisible({ timeout: 5000 });
    await expect(tabpanel.locator("text=Conditional").first()).toBeVisible();
    await expect(tabpanel.locator("text=Fail").first()).toBeVisible();
  });

  test("can select a grade and fill conclusion", async ({ sidePanel }) => {
    await createSession(sidePanel);

    await sidePanel.keyboard.press("3");

    // Click "Pass" grade button — scope to Finalize tabpanel
    const tabpanel = sidePanel.getByRole("tabpanel", { name: /Finalize/ });
    await tabpanel.locator("text=Pass").first().click();

    // Fill conclusion textarea
    const conclusionArea = tabpanel.locator("textarea").first();
    await expect(conclusionArea).toBeVisible({ timeout: 3000 });
    await conclusionArea.fill("This tool meets all TRUST criteria.");

    // Save finalization
    const saveBtn = tabpanel
      .locator('button:has-text("Save"), button:has-text("Save Finalization")')
      .first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();
    // Should show saved indicator
    await expect(tabpanel.locator("text=Saved").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Export", () => {
  test("End Review & Export button visible on Metadata tab", async ({ sidePanel }) => {
    await createSession(sidePanel);

    // Tab order: 2 = Metadata
    await sidePanel.keyboard.press("2");

    await expect(sidePanel.locator('button:has-text("End Review")').first()).toBeVisible({
      timeout: 3000,
    });
  });

  test("clicking export triggers download", async ({ sidePanel }) => {
    await createSession(sidePanel);

    await sidePanel.keyboard.press("2");

    // Start listening for download before clicking
    const downloadPromise = sidePanel.waitForEvent("download", { timeout: 15000 });

    await sidePanel.locator('button:has-text("End Review")').first().click();

    // Handle confirmation dialog
    const confirmExport = sidePanel.locator('button:has-text("Export anyway")').first();
    await expect(confirmExport).toBeVisible({ timeout: 5000 });
    await confirmExport.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
  });
});
