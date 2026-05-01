import react from "@vitejs/plugin-react";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "TRUST Review",
    description: "Systematic evaluation of academic search tools",
    permissions: ["sidePanel", "activeTab", "tabs", "scripting"],
    host_permissions: ["<all_urls>"],
    side_panel: {
      default_path: "sidepanel.html",
    },
    action: {
      default_title: "Open TRUST Review",
    },
  },
  vite: () => ({
    plugins: [react()],
  }),
});
