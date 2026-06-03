import { chromium, expect, test } from "@playwright/test";
import { EXTENSION_PATH } from "./helpers";

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
