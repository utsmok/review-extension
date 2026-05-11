import { test, expect, chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_PATH = path.resolve(__dirname, "../.output/chrome-mv3");

test.describe("Extension smoke test", () => {
  test("extension loads and registers a service worker", async () => {
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        "--no-sandbox",
      ],
    });

    try {
      // The MV3 service worker may take a moment to register.
      // Poll briefly to give Chrome time to spin it up.
      let sw = context.serviceWorkers()[0];
      if (!sw) {
        await context.waitForEvent("serviceworker", { timeout: 5000 });
        sw = context.serviceWorkers()[0];
      }

      expect(sw).toBeDefined();
      expect(sw.url()).toContain("chrome-extension://");
    } finally {
      await context.close();
    }
  });
});
