import { expect, test } from "@playwright/test";

test.describe("Firefox smoke test", () => {
  test("Firefox browser launches and renders HTML", async ({ page }) => {
    await page.goto("data:text/html,<h1>Firefox works</h1>");
    await expect(page.locator("h1")).toHaveText("Firefox works");
  });
});
