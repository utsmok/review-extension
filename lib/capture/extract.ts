/**
 * Extract the best logo image URL from the active page.
 * Looks for: apple-touch-icon, icon links, og:image, then <img> with "logo" in src/class/id.
 */
export async function extractLogoFromPage(
  tabId: number,
): Promise<{ url: string; dataUrl?: string } | null> {
  const [result] = await browser.scripting.executeScript({
    target: { tabId },
    func: () => {
      // Priority 1: apple-touch-icon (usually highest quality PNG)
      const apple = document.querySelector(
        'link[rel="apple-touch-icon"]',
      ) as HTMLLinkElement | null;
      if (apple?.href) return apple.href;

      // Priority 2: icon with largest size (includes SVG favicons)
      const icons = Array.from(
        document.querySelectorAll(
          'link[rel="icon"], link[rel="shortcut icon"], link[type="image/svg+xml"]',
        ),
      ) as HTMLLinkElement[];
      let best: { href: string; size: number } | null = null;
      for (const icon of icons) {
        if (!icon.href) continue;
        // Prefer SVG icons (vector, always high quality)
        const type = (icon.type ?? "").toLowerCase();
        if (type === "image/svg+xml") {
          return icon.href;
        }
        const sizes = icon.getAttribute("sizes") ?? "";
        const match = sizes.match(/(\d+)x\d+/);
        const size = match ? parseInt(match[1], 10) : 0;
        if (!best || size > best.size) best = { href: icon.href, size };
      }
      if (best) return best.href;

      // Priority 3: og:image meta tag (often high-res branding image)
      const og = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
      if (og?.content) return og.content;

      // Priority 4: <img> with "logo" in src, class, or id (SVG or raster)
      const imgs = Array.from(document.querySelectorAll("img")) as HTMLImageElement[];
      for (const img of imgs) {
        const src = (img.src ?? "").toLowerCase();
        const cls = (img.className ?? "").toLowerCase();
        const id = (img.id ?? "").toLowerCase();
        if (src.includes("logo") || cls.includes("logo") || id.includes("logo")) {
          if (img.naturalWidth >= 16 && img.naturalHeight >= 16) return img.src;
        }
      }

      // Priority 5: <svg> element with "logo" in id or class
      const svgs = Array.from(document.querySelectorAll("svg"));
      for (const svg of svgs) {
        const cls = (svg.getAttribute("class") ?? "").toLowerCase();
        const id = (svg.id ?? "").toLowerCase();
        if (cls.includes("logo") || id.includes("logo")) {
          const serialized = new XMLSerializer().serializeToString(svg);
          return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
        }
      }

      return null;
    },
  });
  const logoUrl = result?.result;
  if (!logoUrl) return null;

  // If it's already a data URL (inline SVG), return as-is
  if (logoUrl.startsWith("data:")) {
    return { url: logoUrl, dataUrl: logoUrl };
  }

  // Fetch the image and convert to data URL for preview
  try {
    const resp = await fetch(logoUrl);
    const blob = await resp.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string | null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    return { url: logoUrl, dataUrl: dataUrl ?? undefined };
  } catch {
    return { url: logoUrl };
  }
}
