export async function archivePageHtml(): Promise<{ html: string; title: string }> {
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
  const dangerousUrlAttrs = ["href", "src", "action", "formaction", "xlink:href"];
  clone.querySelectorAll("*").forEach((el) => {
    for (const attr of dangerousUrlAttrs) {
      const val = el.getAttribute(attr);
      if (val) {
        const trimmed = val.trim().toLowerCase();
        if (
          trimmed.startsWith("javascript:") ||
          trimmed.startsWith("vbscript:") ||
          trimmed.startsWith("data:text/html")
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
