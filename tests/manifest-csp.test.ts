// @vitest-environment node
//
// The extension's annotation canvas (tldraw) fetches its UI translations from
// https://cdn.tldraw.com at runtime. If the CSP `connect-src` ever drops that
// origin, the annotation panel CSP-errors on mount — exactly the regression that
// shipped from v0.7.1 (strict-CSP hardening) through v0.8.2 and was only caught
// by manual testing of the built extension.
//
// jsdom cannot enforce CSP, so this is a STATIC assertion on the source manifest
// config: the cheap, deterministic catcher for this class of bug.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const configSrc = readFileSync(resolve(process.cwd(), "wxt.config.ts"), "utf8");

// Shared CSP-directive parser (4 call sites below). Extracted because the regex
// is non-obvious and every directive assertion needs identical parsing.
function directive(csp: string, name: string): string {
  return (csp.match(new RegExp(`\\b${name}\\s+([^;]+)`))?.[1] ?? "").trim();
}

describe("extension Content Security Policy (wxt.config.ts)", () => {
  const match = configSrc.match(/extension_pages:\s*"([^"]+)"/);
  const csp = match?.[1] ?? "";

  it("declares an extension_pages CSP", () => {
    expect(match, "content_security_policy.extension_pages must be defined").not.toBeNull();
    expect(csp.length).toBeGreaterThan(0);
  });

  it("permits the tldraw CDN so the annotation panel can load translations", () => {
    // tldraw fetches its locale JSON from cdn.tldraw.com when the annotation
    // canvas mounts. Without this, the panel is dead on open.
    expect(directive(csp, "connect-src")).toContain("https://cdn.tldraw.com");
  });

  it("connect-src is restrictive (no wildcard, no bare https:)", () => {
    const connectSrc = directive(csp, "connect-src");
    expect(connectSrc).not.toContain("*");
    expect(connectSrc).not.toMatch(/\bhttps:\s*$/);
  });

  it("script-src stays locked to 'self' (no remote code, no unsafe-eval)", () => {
    const scriptSrc = directive(csp, "script-src");
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain("*");
    expect(scriptSrc.toLowerCase()).not.toContain("unsafe-eval");
    expect(scriptSrc.toLowerCase()).not.toContain("unsafe-inline");
  });
});
