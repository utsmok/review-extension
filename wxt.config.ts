import react from "@vitejs/plugin-react";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "TRUST Review",
    description: "Systematic evaluation of academic search tools",

    // ── SECURITY POSTURE ────────────────────────────────────────────────
    // • All data is stored locally in IndexedDB. No external servers.
    // • CSP connect-src 'self' blocks all outbound network from extension pages.
    // • Content scripts (executeScript) run in ISOLATED world — no access to page JS.
    // • executeScript functions are hardcoded (not user-controlled), read-only DOM queries.
    // • Zero eval(), new Function(), or document.write() anywhere in the codebase.
    // • archivePageHtml strips scripts, iframes, event handlers, and dangerous URLs.
    // ────────────────────────────────────────────────────────────────────

    permissions: ["sidePanel", "activeTab", "scripting"],
    host_permissions: ["<all_urls>"],
    side_panel: {
      default_path: "sidepanel.html",
    },
    action: {
      default_title: "Open TRUST Review",
      default_icon: {
        "16": "icon-16.png",
        "19": "icon-19.png",
        "32": "icon-32.png",
        "38": "icon-38.png",
        "48": "icon-48.png",
        "128": "icon-128.png",
      },
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self'",
    },
  },
  vite: () => ({
    plugins: [react()],
  }),
});
