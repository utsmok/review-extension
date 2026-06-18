export default defineBackground(() => {
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Fetch a remote URL and return it as a base64 data: URL.
  // The extension page CSP (connect-src 'self') blocks outbound fetches from
  // the side panel, but the background service worker holds the <all_urls>
  // host permission and is not bound by that CSP — so logo/favicon inlining
  // for the standalone HTML report is routed through here.
  browser.runtime.onMessage.addListener((message: unknown) => {
    const msg = message as { type?: string; url?: unknown };
    if (msg?.type === "trust:fetch-data-url" && typeof msg.url === "string") {
      const url = msg.url;
      return (async () => {
        try {
          const response = await fetch(url);
          if (!response.ok) return { dataUrl: null };
          const blob = await response.blob();
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const mime = blob.type || "image/png";
          return { dataUrl: `data:${mime};base64,${btoa(binary)}` };
        } catch {
          return { dataUrl: null };
        }
      })();
    }
    return undefined;
  });
});
