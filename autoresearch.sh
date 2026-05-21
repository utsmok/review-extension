#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Time the full benchmark run
start_ms=$(date +%s%3N)

output=$(npx vitest bench --config vitest.bench.config.ts bench/ 2>&1) || {
  echo "Benchmark run failed" >&2
  echo "$output" >&2
  exit 1
}

end_ms=$(date +%s%3N)
duration_ms=$(( end_ms - start_ms ))

echo "METRIC bench_duration_ms=${duration_ms}"

# Extract a bench mean from vitest tabular output.
# Usage: extract_mean <section_pattern> <bench_name_pattern>
# Sections are delimited by "✓ bench/..." headers.
extract_mean() {
  local section="$1"
  local bench="$2"
  echo "$output" \
    | awk -v sec="$section" -v bnch="$bench" '
      /✓ bench\// { cur = $0 }
      cur ~ sec && $0 ~ bnch && /·/ {
        # Split line by whitespace, find 4th number (mean)
        n = split($0, fields)
        num = 0
        for (i = 1; i <= n; i++) {
          if (fields[i] ~ /^[0-9]/) {
            num++
            if (num == 4) {
              gsub(/,/, "", fields[i])
              print fields[i]
              exit
            }
          }
        }
      }
    '
}

val=$(extract_mean "uint8ArrayToBase64" "large payload")
[ -n "$val" ] && echo "METRIC uint8_tobase64_large_ms=${val}"

val=$(extract_mean "base64ToUint8Array" "large payload")
[ -n "$val" ] && echo "METRIC b64_frombase64_large_ms=${val}"

val=$(extract_mean "minifyHtml" "large document")
[ -n "$val" ] && echo "METRIC minify_html_large_ms=${val}"

val=$(extract_mean "minifyCss" "large stylesheet")
[ -n "$val" ] && echo "METRIC minify_css_large_ms=${val}"

val=$(extract_mean "computeReportScores" "with finalization")
[ -n "$val" ] && echo "METRIC compute_scores_ms=${val}"
