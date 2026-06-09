import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
    setupFiles: ["./tests/helpers/local-storage.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["lib/**/*.ts", "stores/**/*.ts", "hooks/**/*.ts", "components/**/*.tsx"],
      exclude: ["**/*.css", "**/types.ts", "**/logos.ts", "**/principles.ts", "**/contexts.tsx"],
      thresholds: {
        statements: 75,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
