import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.spec.ts",
  timeout: 30000,
  retries: 2,
  use: {
    headless: false, // Extensions require headed mode
  },
  projects: [
    {
      name: "chrome-extension",
      use: {
        browserName: "chromium",
      },
    },
    {
      name: "firefox-smoke",
      testMatch: "firefox-smoke.spec.ts",
      use: {
        browserName: "firefox",
      },
    },
  ],
});
