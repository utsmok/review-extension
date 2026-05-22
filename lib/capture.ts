import { v4 as uuidv4 } from "uuid";
import type { Capture } from "./types";

const ALLOWED_SCHEMES = ["http:", "https:", "file:"];
const MAX_CAPTURE_SIZE = 25 * 1024 * 1024; // 25 MB total per capture

async function archivePageHtml(): Promise<{ html: string; title: string }> {
  const doc = document;
  const base = doc.baseURI;

  // Clone the entire document
  const clone = doc.cloneNode(true) as Document;

  // 1. Inline all linked stylesheets
  const linkTags = Array.from(clone.querySelectorAll('link[rel="stylesheet"]'));
  const cssFetches = linkTags.map(async (link) => {
    const href = link.getAttribute("href");
    if (!href) return;
    try {
      const absUrl = new URL(href, base).href;
      const resp = await fetch(absUrl);
      const css = await resp.text();
      const style = clone.createElement("style");
      style.textContent = `/* ${href} */\n${css}`;
      link.replaceWith(style);
    } catch {
      // Leave link as fallback
    }
  });

  // 2. Resolve @import in inline styles
  const styleTags = Array.from(clone.querySelectorAll("style"));
  const importResolutions = styleTags.map(async (styleEl) => {
    let css = styleEl.textContent ?? "";
    const importRegex = /@import\s+(?:url\(\s*)?['"]([^'")\s]+)['"]\s*(?:\)\s*)?;/g;
    let match: RegExpExecArray | null = importRegex.exec(css);
    const replacements: Promise<{ original: string; replacement: string }>[] = [];
    while (match !== null) {
      const original = match[0];
      const importUrl = match[1];
      replacements.push(
        fetch(new URL(importUrl, base).href)
          .then((r) => r.text())
          .then((importedCss) => ({ original, replacement: importedCss }))
          .catch(() => ({ original, replacement: original })),
      );
      match = importRegex.exec(css);
    }
    const results = await Promise.allSettled(replacements);
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { original, replacement } = result.value;
        css = css.replace(original, replacement);
      }
    }
    styleEl.textContent = css;
  });

  // Use allSettled so one slow CSS resource doesn't block everything
  await Promise.allSettled([...cssFetches, ...importResolutions]);

  // 3. Strip scripts to prevent execution in archive
  clone.querySelectorAll("script").forEach((el) => {
    el.remove();
  });
  clone.querySelectorAll("noscript").forEach((el) => {
    el.remove();
  });

  // 4. Make relative URLs absolute so resources still load
  const makeAbsolute = (attr: string, selector: string) => {
    clone.querySelectorAll(selector).forEach((el) => {
      const val = el.getAttribute(attr);
      if (val && !val.startsWith("#") && !val.startsWith("data:") && !val.startsWith("blob:")) {
        try {
          el.setAttribute(attr, new URL(val, base).href);
        } catch {
          // leave as-is
        }
      }
    });
  };

  makeAbsolute("href", "a[href]");
  makeAbsolute("src", "img[src]");
  makeAbsolute("src", "script[src]");
  makeAbsolute("src", "iframe[src]");
  makeAbsolute("src", "video[src]");
  makeAbsolute("src", "source[src]");
  makeAbsolute("href", "link[href]");
  makeAbsolute("data", "object[data]");
  makeAbsolute("poster", "video[poster]");

  // 4. Resolve url() in inline styles to absolute
  clone.querySelectorAll("[style]").forEach((el) => {
    const style = el.getAttribute("style") ?? "";
    const resolved = style.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (full, path) => {
      if (path.startsWith("data:") || path.startsWith("blob:")) return full;
      try {
        return `url('${new URL(path, base).href}')`;
      } catch {
        return full;
      }
    });
    if (resolved !== style) el.setAttribute("style", resolved);
  });

  // 5. Inject a base tag so relative resolution still works
  const existingBase = clone.querySelector("base");
  if (!existingBase) {
    const baseTag = clone.createElement("base");
    baseTag.setAttribute("href", base);
    const head = clone.querySelector("head");
    if (head) head.prepend(baseTag);
  }

  // 6. Add archive metadata
  const comment = clone.createComment(
    `\n  Archived by TRUST Review Extension\n  Source: ${doc.location?.href}\n  Date: ${new Date().toISOString()}\n`,
  );
  const headEl = clone.querySelector("head");
  if (headEl) headEl.prepend(comment);

  return {
    html: `<!DOCTYPE html>\n${clone.documentElement.outerHTML}`,
    title: doc.title,
  };
}

export async function captureActiveTab(): Promise<Capture> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.id || !tab.url) {
    throw new Error("No active tab found");
  }

  // C9: URL scheme allowlist — block restricted browser-internal pages
  try {
    const url = new URL(tab.url);
    if (!ALLOWED_SCHEMES.includes(url.protocol)) {
      throw new Error(
        `Cannot capture this page — ${url.protocol} URLs are not accessible. Browser-internal pages cannot be captured.`,
      );
    }
  } catch (err) {
    if (err instanceof TypeError) {
      // Malformed URL
      throw new Error("Cannot capture this page — the URL is invalid.");
    }
    throw err;
  }

  const screenshotUri: string = await browser.tabs.captureVisibleTab(tab.windowId, {
    format: "png",
  });

  const [result] = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: archivePageHtml,
  });

  const scriptResult = result?.result as { html: string; title: string } | undefined;

  const htmlContent = scriptResult?.html ?? "";
  const capture: Capture = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    sourceUrl: tab.url,
    pageTitle: scriptResult?.title ?? "",
    screenshotBase64: screenshotUri,
    htmlContent,
    notes: "",
  };

  // I8: Size limit — truncate HTML if capture is too large
  const totalSize = capture.screenshotBase64.length + capture.htmlContent.length;
  if (totalSize > MAX_CAPTURE_SIZE) {
    const overhead = capture.screenshotBase64.length;
    const htmlBudget = Math.max(0, MAX_CAPTURE_SIZE - overhead);
    capture.htmlContent = `${htmlContent.slice(0, htmlBudget)}\n<!-- TRUNCATED: page content exceeded size limit -->`;
  }

  return capture;
}

export async function captureCurrentPageInfo(): Promise<{
  url: string;
  title: string;
  faviconUrl?: string;
}> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return {
    url: tab.url ?? "",
    title: tab.title ?? "",
    faviconUrl: tab.favIconUrl,
  };
}

/**
 * Extract the best logo image URL from the active page.
 * Looks for: apple-touch-icon, icon links, og:image, then <img> with "logo" in src/class/id.
 */
async function extractLogoFromPage(
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
          return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(serialized);
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

/**
 * Capture the active tab and associate the result with a metadata field.
 * For "toolLogoUrl", also extracts the best logo image from the page.
 */
export async function captureForMetadataField(field: string): Promise<{
  capture: Capture;
  logoUrl?: string;
  logoDataUrl?: string;
}> {
  const capture = await captureActiveTab();
  capture.metadataField = field;

  let logoUrl: string | undefined;
  let logoDataUrl: string | undefined;
  if (field === "toolLogoUrl") {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const logo = await extractLogoFromPage(tab.id);
      if (logo) {
        logoUrl = logo.url;
        logoDataUrl = logo.dataUrl;
      }
    }
  }

  return { capture, logoUrl, logoDataUrl };
}
