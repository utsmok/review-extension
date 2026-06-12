import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const projectRoot = path.resolve(__dirname, "..");

export default defineConfig({
  base: "./",
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: [
      // Override capture module with web-safe version (no browser APIs)
      // MUST come before the general @ alias
      { find: "@/lib/capture", replacement: path.resolve(__dirname, "shims/web-capture.ts") },
      // Override sidepanel zoom with no-op (not relevant for full-page)
      { find: "@/hooks/useSidepanelZoom", replacement: path.resolve(__dirname, "shims/noop-hook.ts") },
      // @/ → project root (same as the extension's tsconfig paths)
      { find: "@", replacement: projectRoot },
    ],
  },
  css: {
    postcss: path.resolve(projectRoot, "postcss.config.js"),
  },
  build: {
    outDir: path.resolve(projectRoot, "site/try"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Stable filenames for deployment
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
