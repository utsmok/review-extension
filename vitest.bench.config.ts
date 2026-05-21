import codspeed from "@codspeed/vitest-plugin";
import { defineConfig } from "vitest/config";
import path from "node:path";

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
