import path from "node:path";
import codspeed from "@codspeed/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [codspeed()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    benchmark: {
      include: ["bench/**/*.bench.ts"],
    },
  },
});
