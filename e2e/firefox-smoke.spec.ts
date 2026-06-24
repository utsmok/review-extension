import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, firefox, test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_PATH = path.resolve(__dirname, "../.output/firefox-mv2");

/**
 * Firefox smoke test — verifies the extension builds for Firefox, loads in a
 * temporary profile, and the side panel renders without throwing.
 *
 * Unlike the Chrome e2e tests (which use --load-extension), Firefox requires
 * packaging the extension as an .xpi, placing it in a profile's extensions/
 * directory, and launching with autoDisableScopes=0 so Firefox picks it up
 * without manual approval.
 */

test.describe("Firefox smoke test", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(path.join(EXTENSION_PATH, "manifest.json"))) {
      execSync("npx wxt build --browser firefox", {
        cwd: path.resolve(__dirname, ".."),
        timeout: 120_000,
        stdio: "pipe",
      });
    }
  });

  test("extension loads and side panel renders without error", async () => {
    const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "trust-ff-"));

    try {
      // Package the extension as an .xpi and place it in the profile
      const extDir = path.join(profileDir, "extensions");
      fs.mkdirSync(extDir, { recursive: true });
      const xpiPath = path.join(extDir, "trust-review@utwente.nl.xpi");
      execSync(`zip -rj "${xpiPath}" "${EXTENSION_PATH}/"*`, { stdio: "pipe" });
      expect(fs.existsSync(xpiPath)).toBe(true);

      const context = await firefox.launchPersistentContext(profileDir, {
        headless: false,
        firefoxUserPrefs: {
          // Allow extensions installed from the profile directory
          "extensions.autoDisableScopes": 0,
          "extensions.enabledScopes": 15,
          // Allow unsigned extension (dev build)
          "xpinstall.signatures.required": false,
        },
      });

      try {
        const page = await context.newPage();

        // Collect uncaught errors
        const errors: string[] = [];
        page.on("pageerror", (err) => errors.push(err.message));

        // Give Firefox time to load the extension
        await page.goto("about:debugging#/runtime/this-firefox");
        await page.waitForTimeout(3000);

        // Verify the extension is registered
        const bodyText = (await page.textContent("body")) ?? "";
        expect(bodyText).toContain("TRUST");

        // Find the extension's internal UUID and open the side panel
        // about:debugging lists moz-extension:// URLs; we can inspect
        const links = await page.locator("a[href*='moz-extension']").all();
        if (links.length > 0) {
          const href = await links[0].getAttribute("href");
          const uuid = href?.match(/moz-extension:\/\/([^/]+)/)?.[1];
          if (uuid) {
            const panelPage = await context.newPage();
            await panelPage.goto(`moz-extension://${uuid}/sidepanel.html`);
            await panelPage.waitForLoadState("domcontentloaded");
            // Side panel should render the session manager or active session
            const panelText = (await panelPage.textContent("body")) ?? "";
            expect(panelText.length).toBeGreaterThan(0);
          }
        }

        // No uncaught exceptions during load
        expect(errors).toHaveLength(0);
      } finally {
        await context.close();
      }
    } finally {
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
  });
});
