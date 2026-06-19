import { describe, expect, it } from "vitest";
import { buildHtmlReport } from "@/lib/html-report";
import { minifyHtml } from "@/lib/minify";
import {
  makeCapture,
  makeEvaluation,
  makeFinalization,
  makeMetadata,
  RUBRIC,
} from "@/tests/fixtures";

/**
 * Regression guard for the v0.9.0–v0.9.2 evidence-lightbox bug.
 *
 * The production export pipeline runs `minifyHtml` over the generated report,
 * but the dev QA tool (`scripts/gen-standalone.ts`) writes the report WITHOUT
 * minifying. For two releases the minifier collapsed whitespace across the
 * whole document — including the inline `<script>` — deleting its newlines.
 * The first `//` line-comment then ran to end-of-input, the IIFE never closed,
 * and the script threw `SyntaxError: Unexpected end of input` on parse: the
 * lightbox click handler never registered, so no screenshot could be enlarged
 * in a real export. (The Details popovers kept working because they use the
 * native Popover API, which needs no JS.)
 *
 * This test exercises the real export path end-to-end — build a report, minify
 * it the way the export pipeline does, and assert the inline script still
 * parses and that code following a `//` comment survives. It would have failed
 * loudly under both v0.9.1 and v0.9.2.
 */
describe("report export minify smoke", () => {
  it("minifyHtml leaves the report's inline <script> parseable", async () => {
    const metadata = makeMetadata({ toolName: "MinifySmokeTool" });
    const captures = [makeCapture({ pageTitle: "Evidence page" })];
    const evaluations = [makeEvaluation({ rubricId: "TR.data_source_clarity", score: 2 })];
    const html = await buildHtmlReport(
      metadata,
      captures,
      evaluations,
      RUBRIC,
      makeFinalization({ grade: "pass" }),
    );

    const minified = minifyHtml(html);

    const start = minified.indexOf("<script>");
    const end = minified.indexOf("</script>");
    expect(start, "report must contain an inline <script>").toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const scriptBody = minified.slice(start + "<script>".length, end);

    // Root cause guard: newline collapse made the script a single line, so the
    // first `//` comment swallowed every statement after it.
    expect(scriptBody.split("\n").length, "script newlines must survive minify").toBeGreaterThan(1);

    // The script must parse. The original bug produced
    // `SyntaxError: Unexpected end of input` here.
    expect(() => new Function(scriptBody)).not.toThrow();

    // Code that lives AFTER a `//` comment in the source (the showPopover call
    // follows the "Top-layer popover" comment) must still be present — i.e. the
    // comment did not run to end-of-input. This is the lightbox open path.
    expect(scriptBody).toContain("trust-lightbox");
    expect(scriptBody).toContain("showPopover");
  });
});
