import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["lib/**/*.ts", "stores/**/*.ts", "hooks/**/*.ts"],
      exclude: [
        "**/*.css",
        "**/types.ts",
        "**/logos.ts",
        "**/principles.ts",
        "**/contexts.tsx",
      ],
    },
  },
});
