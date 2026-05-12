#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "=== TRUST Review Extension — ZIP Export Size Benchmark ==="

npx vitest run --reporter=verbose tests/export-size.test.ts 2>&1
