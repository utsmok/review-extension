import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext, Page } from "@playwright/test";
import { chromium, expect, test as base } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const EXTENSION_PATH = path.resolve(__dirname, "../.output/chrome-mv3");

/**
 * Resolve the extension ID from a running browser context's service worker.
 */
export function getExtensionId(context: BrowserContext): string | undefined {
  const sw = context.serviceWorkers()[0];
  if (!sw) return undefined;
  const match = sw.url().match(/^chrome-extension:\/\/([a-z]{32})\//);
  return match?.[1];
}

/**
 * Custom test fixture that loads the extension, opens the side panel, and
 * provides `sidePanel` (Page), `context` (BrowserContext), and `extensionId`.
 */
type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  sidePanel: Page;
};

export const test = base.extend<ExtensionFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright extend requires empty fixture destructuring
  context: async ({}, use) => {
    const ctx = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        "--no-sandbox",
      ],
    });
    if (!ctx.serviceWorkers()[0]) {
      await ctx.waitForEvent("serviceworker", { timeout: 5000 });
    }
    await use(ctx);
    await ctx.close();
  },
  extensionId: async ({ context }, use) => {
    const id = getExtensionId(context);
    if (!id) throw new Error("Extension service worker not found — cannot resolve extension ID");
    await use(id);
  },
  sidePanel: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await page.waitForLoadState("domcontentloaded");
    await use(page);
  },
});

export { expect };

/**
 * Create a new review session via the modal dialog.
 * Targets inputs scoped to the `[role="dialog"]` to avoid
 * picking up hidden file inputs elsewhere in the DOM.
 */
export async function createSession(page: Page, toolName = "Test Tool"): Promise<void> {
  await page.click("text=Start New Review");

  // Wait for the modal dialog to appear
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 5000 });

  // Fill tool name (input inside the dialog)
  await dialog.locator('input[type="text"], input:not([type])').first().fill(toolName);

  // Fill URL
  await dialog.locator('input[type="url"]').fill("https://example.com");

  // Submit
  await dialog.locator('button[type="submit"]').click();

  // Should land on the active session view — verify the Evaluation tab is visible
  await expect(page.getByRole("tab", { name: /Evaluation/ })).toBeVisible({ timeout: 10000 });
}
