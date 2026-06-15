// Read a vitest JSON results file and emit a shields.io endpoint badge JSON.
// Drives the dynamic "tests" badge in the README. The badge JSON is published to
// an orphan `badges` branch by .github/workflows/test-badge.yml.
//
// Local usage:
//   pnpm test -- --reporter=json --outputFile=test-results.json
//   node scripts/badge-test-count.mjs test-results.json [out.json]
import { readFileSync, writeFileSync } from "node:fs";

const [resultsPath, outPath = "test-count.json"] = process.argv.slice(2);
if (!resultsPath) {
  console.error("Usage: badge-test-count.mjs <vitest-results.json> [out.json]");
  process.exit(1);
}

const results = JSON.parse(readFileSync(resultsPath, "utf-8"));
const passed = results.numPassedTests ?? 0;
const total = results.numTotalTests ?? passed;

const color = total === 0 ? "red" : passed === total ? "brightgreen" : "yellow";
const badge = {
  schemaVersion: 1,
  label: "tests",
  message: total > 0 ? `${passed} passing` : "no tests",
  color,
};

writeFileSync(outPath, `${JSON.stringify(badge, null, 2)}\n`);
console.log(`Wrote ${outPath}: ${badge.message}`);
