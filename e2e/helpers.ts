import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BrowserContext, chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_PATH = path.resolve(__dirname, "../.output/chrome-mv3");

/**
 * Launch Chromium with the TRUST Review Extension loaded.
 *
 * Uses `launchPersistentContext` so the extension is active immediately.
 * Returns the context plus a `close` helper for teardown.
 */
export async function launchExtension(): Promise<{
  context: BrowserContext;
  close: () => Promise<void>;
}> {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--no-sandbox",
    ],
  });

  return {
    context,
    close: async () => {
      await context.close();
    },
  };
}

/**
 * Resolve the extension ID from a running context by inspecting its
 * service workers. Returns `undefined` if no service worker is found.
 */
export function getExtensionId(context: BrowserContext): string | undefined {
  const sw = context.serviceWorkers()[0];
  if (!sw) return undefined;
  // URL is chrome-extension://<ID>/background.js
  const url = sw.url();
  const match = url.match(/^chrome-extension:\/\/([a-z]{32})\//);
  return match?.[1];
}

/**
 * Build the sidePanel URL for the loaded extension.
 * Falls back to a placeholder if the extension ID cannot be resolved.
 */
export function sidePanelUrl(context: BrowserContext): string {
  const id = getExtensionId(context);
  return `chrome-extension://${id}/sidepanel.html`;
}
