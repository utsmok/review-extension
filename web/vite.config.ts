import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const projectRoot = path.resolve(__dirname, "..");

/**
 * Vite plugin that rewrites relative imports of tldraw components to use
 * the @/ alias, which is then caught by resolve.alias and redirected to stubs.
 * This is needed because Vite's resolve.alias doesn't reliably intercept
 * relative dynamic imports with Rolldown.
 */
function rewriteTldrawImports() {
  const shimDir = path.resolve(__dirname, "shims");
  return {
    name: "rewrite-tldraw-imports",
    enforce: "pre" as const,
    resolveId(source: string, importer: string | undefined) {
      if (!importer) return null;
      // Match "./TldrawAnnotation" from any file in components/
      if (source === "./TldrawAnnotation" || source === "./TldrawAnnotation.tsx") {
        return path.resolve(shimDir, "TldrawAnnotation.ts");
      }
      if (source === "./TldrawCanvas" || source === "./TldrawCanvas.tsx") {
        return path.resolve(shimDir, "TldrawCanvas.tsx");
      }
      return null;
    },
  };
}

export default defineConfig({
  base: "./",
  root: __dirname,
  plugins: [rewriteTldrawImports(), react()],
  resolve: {
    alias: [
      // Override capture module with web-safe version (no browser APIs)
      // MUST come before the general @ alias
      { find: "@/lib/capture", replacement: path.resolve(__dirname, "shims/web-capture.ts") },
      // Override sidepanel zoom with no-op (not relevant for full-page)
      {
        find: "@/hooks/useSidepanelZoom",
        replacement: path.resolve(__dirname, "shims/noop-hook.ts"),
      },
      // Override tldraw with license-free stubs via @/ alias (for useTldrawEditor etc.)
      {
        find: "@/components/TldrawCanvas",
        replacement: path.resolve(__dirname, "shims/TldrawCanvas.tsx"),
      },
      {
        find: "@/components/TldrawAnnotation",
        replacement: path.resolve(__dirname, "shims/TldrawAnnotation.ts"),
      },
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
