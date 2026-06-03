import { defineConfig } from "@playwright/test";

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
