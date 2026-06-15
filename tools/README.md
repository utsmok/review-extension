# `tools/` — rubric autoresearch harness (research-only)

These scripts are **standalone research tooling**. They are not part of the
extension build, the test suite, or CI; nothing here is imported by production
code, and the directory is excluded from linting (`biome.json`). Nothing in
`tools/` ships to users.

## Purpose

An offline loop for improving the TRUST rubric wording
(`data/rubrics/trust-full.json`): **measure → rewrite → measure → compare →
accept/rollback**. It runs static measurements over the rubric and, when an LLM
is available, LLM-based boundary discrimination, then proposes and applies
wording rewrites and keeps them only if they improve the measurements.

## Files

- `loop.ts` — orchestrates the full measure → rewrite → measure → compare cycle.
- `measure-static.ts` — static (no-LLM) rubric measurements.
- `measure-llm.ts` — LLM-based boundary-discrimination measurements.
- `rewrite.ts` — proposes and applies rubric wording rewrites.
- `types.ts` — shared types (`RubricData`, `MeasurementReport`, `IterationState`, …).
- `output/` — captured iteration artifacts (proposals, accepted/rejected JSON, reports).

## Running

Invoked ad hoc from a capable agent runtime (e.g. an `eval` tool with `fs`
access), not via `pnpm`. See the header comment in `loop.ts` for the entry point
(`runLoop`).
