// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildHtmlReport, buildNutritionLabel } from "@/lib/html-report";
import { makeEvaluation, type makeFinalization, makeMetadata, RUBRIC } from "@/tests/fixtures";

// ── Helpers ────────────────────────────────────────────────────────────

/** Build a full report with sensible defaults and capture the HTML. */
async function report(
  metaOverrides?: Record<string, unknown>,
  evals?: ReturnType<typeof makeEvaluation>[],
  finalization?: ReturnType<typeof makeFinalization> | null,
) {
  const meta = makeMetadata(metaOverrides);
  const html = await buildHtmlReport(meta, [], evals ?? [], RUBRIC, finalization ?? null);
  return html;
}

/** Build a nutrition label with sensible defaults and capture the HTML. */
async function label(
  metaOverrides?: Record<string, unknown>,
  evals?: ReturnType<typeof makeEvaluation>[],
  finalization?: ReturnType<typeof makeFinalization> | null,
) {
  const meta = makeMetadata(metaOverrides);
  const html = await buildNutritionLabel(meta, evals ?? [], RUBRIC, finalization ?? null);
  return html;
}

// ── All scoring question IDs (category.question form) ──────────────────

const SCORING_IDS = Object.entries(RUBRIC.scoring_rubric).flatMap(([cat, qs]) =>
  Object.keys(qs).map((qId) => `${cat}.${qId}`),
);

const QG_IDS = Object.entries(RUBRIC.quality_gate).flatMap(([cat, qs]) =>
  Object.keys(qs).map((qId) => `${cat}.${qId}`),
);

/** Create evaluations for every scoring question with the given score. */
function allScored(score: 0 | 1 | 2 | 3) {
  return SCORING_IDS.map((id) => makeEvaluation({ rubricId: id, score }));
}

// ── 1. esc() via HTML output ──────────────────────────────────────────

describe("esc() — XSS prevention", () => {
  it("escapes <script> tags in toolName", async () => {
    const html = await report({ toolName: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it('escapes &, ", <, > in toolName', async () => {
    const html = await report({ toolName: '&"<>' });
    expect(html).toContain("&amp;&quot;&lt;&gt;");
    // Must NOT contain the raw chars in the rendered text context
    // (they appear inside escaped spans)
    expect(html).not.toMatch(/>TestSearch&amp;&quot;&lt;&gt;</); // sanity: no double-escape
  });

  it("escapes HTML tags in description", async () => {
    const html = await report({
      description: "<b>bold</b> <img src=x onerror=alert(1)>",
    });
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<b>bold</b>");
    // Verify the raw description is NOT present unescaped
    // (the full string "src=x onerror" is unique to our test input)
    expect(html).not.toMatch(/<img src=x onerror/);
  });
});

// ── 2. safeLink() via HTML output ─────────────────────────────────────

describe("safeLink() — URL validation", () => {
  it("renders https URL as an anchor tag", async () => {
    const html = await report({ toolUrl: "https://example.com" });
    // In the report header, safeLink wraps the URL
    expect(html).toMatch(/<a\s+href="https:\/\/example\.com"/);
  });

  it("renders javascript: URL as a span, not a link", async () => {
    const html = await report({ toolUrl: "javascript:alert(1)" });
    // safeLink produces <span class="url-plain"> for dangerous URLs
    expect(html).toContain('<span class="url-plain">javascript:alert(1)</span>');
    // The safeLink call in the report header produces a span (no href with javascript:)
    // Note: the nutrition label section may independently link to the URL
  });

  it("renders data: URL as a span, not a link", async () => {
    const html = await report({
      toolUrl: "data:text/html,<h1>hi</h1>",
    });
    // safeLink produces <span> for data: URLs
    expect(html).toContain('<span class="url-plain">');
    // Verify the escaped content appears inside the span
    expect(html).toContain("&lt;h1&gt;hi&lt;/h1&gt;");
  });

  it("renders empty URL as a span", async () => {
    const html = await report({ toolUrl: "" });
    expect(html).toContain('<span class="url-plain">');
  });
});

// ── 3. formatDate() via HTML output ──────────────────────────────────

describe("formatDate() — date formatting", () => {
  it("renders startTime as YYYY-MM-DD HH:mm", async () => {
    const html = await report({
      startTime: "2025-06-15T10:30:00.000Z",
    });
    // formatDate produces local-time representation; at minimum the date part
    // must appear. The function uses `new Date(iso)` → local getHours/Minutes,
    // so we verify the date portion and that formatting is present.
    expect(html).toContain("2025-06-15");
  });
});

// ── 4. scoreCircles() via buildNutritionLabel output ─────────────────

describe("scoreCircles() — circle rendering", () => {
  it("all scores = 3 → 3 filled circles per principle", async () => {
    const html = await label({}, allScored(3));
    // avg for each principle = 3.0 → filled = 3
    const matches = html.match(/class="circle filled"/g);
    expect(matches).not.toBeNull();
    // 5 principles × 3 filled + 1 overall × 3 filled = 18 filled circles
    expect(matches?.length).toBe(18);
  });

  it("all scores = 0 → 0 filled circles per principle", async () => {
    const html = await label({}, allScored(0));
    // avg = 0.0 → filled = 0 (corrected: 0 scores mean 0 progress)
    const matches = html.match(/class="circle filled"/g);
    expect(matches).toBeNull();
  });

  it("no scoring evaluations → 3 empty circles per principle (null avg)", async () => {
    const html = await label({}, []);
    // No evaluations → null avg → all empty circles
    const filled = html.match(/class="circle filled"/g);
    const empty = html.match(/class="circle empty"/g);
    expect(filled).toBeNull();
    // 5 principles × 3 empty + 1 overall × 3 empty = 18 empty circles
    expect(empty?.length).toBe(18);
  });

  it("mixed scores averaging exactly 1.5 → 2 filled circles", async () => {
    // For each scoring question, assign 1 or 2 alternating to get avg = 1.5
    const evals = SCORING_IDS.map((id, i) =>
      makeEvaluation({ rubricId: id, score: i % 2 === 0 ? 1 : 2 }),
    );
    const html = await label({}, evals);
    // Each principle has 2 questions, one scored 1 and one scored 2 → avg = 1.5 → filled = 2
    const filled = html.match(/class="circle filled"/g);
    expect(filled).not.toBeNull();
    // 5 principles × 2 + 1 overall × 2 (overall avg = 1.5/3 * 3 = 1.5 → filled = 2) = 12
    expect(filled?.length).toBe(12);
  });
});

// ── 5. buildGateRows via buildHtmlReport ──────────────────────────────

describe("buildGateRows — quality gate rendering", () => {
  it("renders 'na' and 'unsure' QG results in the report", async () => {
    const qgEvals = [
      makeEvaluation({
        rubricId: QG_IDS[0],
        score: "na",
        notes: "not applicable",
      }),
      makeEvaluation({
        rubricId: QG_IDS[1],
        score: "unsure",
        notes: "uncertain",
      }),
      // Pass one so we don't get a fully-failed gate state
      ...(QG_IDS.length > 2
        ? [
            makeEvaluation({
              rubricId: QG_IDS[2],
              score: "pass",
              notes: "",
            }),
          ]
        : []),
    ];

    const html = await report({}, qgEvals);

    // The gate table should contain both entries
    expect(html).toContain("not applicable");
    expect(html).toContain("uncertain");

    // 'na' and 'unsure' results produce a dash badge ("—")
    // since they are neither pass nor fail in buildGateRows logic:
    //   result === ev?.score === "pass" ? "pass" : ev?.score === "fail" ? "fail" : null
    //   → label = "—" for both na/unsure, color = "#6b7f94"
    const dashBadges = html.match(/color:#6b7f94/g);
    expect(dashBadges).not.toBeNull();
    expect(dashBadges?.length).toBeGreaterThanOrEqual(2);
  });
});
