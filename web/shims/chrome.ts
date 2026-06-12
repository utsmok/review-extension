/**
 * Chrome/WXT browser API shims for the web trial build.
 * Provides stub implementations so existing extension code can run
 * in a regular browser tab without Chrome extension APIs.
 */

const noop = () => {};

export const scripting = {
  executeScript: async () => [{ result: { html: "", title: "Web Trial" } }],
};

export const tabs = {
  query: async () => [{ id: 1, url: "about:blank", title: "Web Trial" }],
  captureVisibleTab: async () => {
    throw new Error("Screenshot capture is available in the browser extension.");
  },
};

export const sidePanel = {
  setPanelBehavior: noop,
};

export const activeTab = {};

/** Install the shim as `globalThis.browser` so WXT-style imports resolve. */
export function installBrowserShim() {
  const _g = globalThis as Record<string, unknown>;
  if (!_g.browser) {
    _g.browser = { scripting, tabs, sidePanel, activeTab };
  }
}
