#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")" || exit 1

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

# Extract mean time from vitest bench output.
# Each section starts with a header containing the describe block name.
# Data rows follow with format: "   · <bench_name>  <hz>  <min>  <max>  <mean> ..."
# The mean is the 4th numeric field (after hz, min, max).
#
# Usage: extract_mean <section_keyword> <bench_name_keyword>
# Finds the section header, then the first data row matching bench_name after it.
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
echo "$output" > "$tmp"

extract_mean() {
  local section="$1"
  local bench="$2"
  # Find the line number of the section header
  local sec_line
  sec_line=$(grep -n "$section" "$tmp" | head -1 | cut -d: -f1)
  [ -z "$sec_line" ] && return
  # Search from that line onward for the bench name in a data row (contains numbers)
  local target_line
  target_line=$(sed -n "${sec_line},\$p" "$tmp" | grep -n "$bench" | grep '[0-9]\.[0-9]' | head -1 | cut -d: -f1)
  [ -z "$target_line" ] && return
  # Absolute line number
  local abs_line=$(( sec_line + target_line - 1 ))
  # Extract the 4th decimal number from that line (mean = hz, min, max, mean)
  local val
  val=$(sed -n "${abs_line}p" "$tmp" | grep -oE '[0-9,]+\.[0-9]+' | tr -d ',' | sed -n '4p')
  [ -n "$val" ] && echo "$val"
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

# tmp cleaned up by EXIT trap
