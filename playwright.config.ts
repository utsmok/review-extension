import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.spec.ts",
  timeout: 30000,
  retries: 0,
  use: {
    headless: false, // Extensions require headed mode
  },
  projects: [
    {
      name: "chrome-extension",
      use: {
        // Set via fixture; required placeholder for PW
        browserName: "chromium",
      },
    },
  ],
});
