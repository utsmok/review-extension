import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
  manifest: {
    name: 'TRUST Review',
    description: 'Systematic evaluation of academic search tools',
    permissions: ['sidePanel', 'activeTab', 'tabs'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
    action: {
      default_title: 'Open TRUST Review',
    },
  },
  vite: () => ({
    plugins: [react()],
  }),
});
