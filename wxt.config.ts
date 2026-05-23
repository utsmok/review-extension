import react from "@vitejs/plugin-react";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "TRUST Review",
    description: "Systematic evaluation of academic search tools",
    permissions: ["sidePanel", "activeTab", "tabs", "scripting"],
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
  },
  vite: () => ({
    plugins: [react()],
  }),
});
