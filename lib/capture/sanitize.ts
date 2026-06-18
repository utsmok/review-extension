/** Strip control characters that browsers silently remove from URL attribute
 * values before resolving the scheme. This closes the embedded-whitespace
 * bypass where `java\tscript:` or `java\nscript:` would execute.
 * Only TAB, LF, and CR are removed by browsers per the URL spec. */
function normalizeUrlForSchemeCheck(val: string): string {
  return val.replace(/[\t\n\r]/g, "");
}
/** Clone the current page DOM, inline CSS, strip scripts/dangerous elements, resolve URLs, and return a self-contained HTML archive. */
export async function archivePageHtml(): Promise<{ html: string; title: string }> {
  const doc = document;
  const base = doc.baseURI;

  // Clone the entire document (full clone is required: archivePageHtml must produce
  // a self-contained HTML document including head/styles/body for offline viewing)
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

  // 3b. Remove dangerous elements that can execute code or load arbitrary content
  clone.querySelectorAll("iframe, object, embed, frame, applet, base").forEach((el) => {
    el.remove();
  });

  // 3c. Strip all on* event handler attributes from every element
  clone.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.length > 2 && attr.name.slice(0, 2).toLowerCase() === "on") {
        el.removeAttribute(attr.name);
      }
    }
  });

  // 3d. Sanitize javascript:/vbscript:/data:text/html URLs
  const dangerousUrlAttrs = ["href", "src", "srcset", "action", "formaction", "xlink:href"];
  clone.querySelectorAll("*").forEach((el) => {
    for (const attr of dangerousUrlAttrs) {
      const val = el.getAttribute(attr);
      if (val) {
        const cleaned = normalizeUrlForSchemeCheck(val).toLowerCase();
        if (
          cleaned.startsWith("javascript:") ||
          cleaned.startsWith("vbscript:") ||
          cleaned.startsWith("data:text/html")
        ) {
          el.removeAttribute(attr);
        }
      }
    }
  });

  // 3e. Remove meta http-equiv refresh (can redirect to JS URLs)
  clone.querySelectorAll('meta[http-equiv="refresh" i]').forEach((el) => {
    el.remove();
  });

  // 3f. Strip external url() references in inline styles (prevent network requests)
  clone.querySelectorAll("style").forEach((styleEl) => {
    if (styleEl.textContent) {
      styleEl.textContent = styleEl.textContent.replace(
        /url\(\s*['"]?(?!data:)[^)]*\)\s*/gi,
        "/* stripped external URL */",
      );
    }
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
  makeAbsolute("srcset", "img[srcset], source[srcset]");

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

/**
 * Re-sanitize an imported HTML archive string using the same strip rules as
 * archivePageHtml. Defense-in-depth: foreign ZIPs may carry unsanitized HTML.
 * Uses DOMParser (available in the extension sidepanel and in jsdom tests).
 */
export function sanitizeArchiveHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const dangerous = "script,iframe,object,embed,base,frame,applet,noscript";
  doc.querySelectorAll(dangerous).forEach((el) => {
    el.remove();
  });
  const urlAttrs = /^(href|src|srcset|action|formaction|xlink:href)$/i;
  const badSchemeClean = /^\s*(javascript|vbscript|data:text\/html)/i;
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
      else if (
        urlAttrs.test(attr.name) &&
        badSchemeClean.test(normalizeUrlForSchemeCheck(attr.value))
      )
        el.removeAttribute(attr.name);
    }
  });
  doc.querySelectorAll("meta[http-equiv]").forEach((m) => {
    if (/refresh/i.test(m.getAttribute("http-equiv") ?? "")) {
      m.remove();
    }
  });
  // Strip external url() references in <style> elements (match archivePageHtml)
  doc.querySelectorAll("style").forEach((styleEl) => {
    if (styleEl.textContent) {
      styleEl.textContent = styleEl.textContent.replace(
        /url\(\s*['"]?(?!data:)[^)]*\)\s*/gi,
        "/* stripped external URL */",
      );
    }
  });

  // Strip external url() references in inline [style] attributes (prevent network requests)
  doc.querySelectorAll("[style]").forEach((el) => {
    const style = el.getAttribute("style") ?? "";
    const cleaned = style.replace(
      /url\(\s*['"]?(?!data:)[^)]*\)\s*/gi,
      "/* stripped external URL */",
    );
    if (cleaned !== style) el.setAttribute("style", cleaned);
  });
  return doc.documentElement.outerHTML;
}
