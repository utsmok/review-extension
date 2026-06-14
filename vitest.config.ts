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
        statements: 73,
        branches: 66,
        functions: 66,
        lines: 75,
        // ratchet: raise as coverage improves — was aspirational 75/75/80/80, unenforced
      },
    },
  },
});
