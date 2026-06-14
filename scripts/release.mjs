#!/usr/bin/env node
/**
 * Release automation script.
 * Usage: pnpm release <patch|minor|major>
 *
 * 1. Pre-flight guards (branch, clean tree, CHANGELOG entry) — before any mutation.
 * 2. Full local gate (prepare → typecheck → test → build) — the tag never ships
 *    if the code that CI will check is red. This is exactly what bit v0.8.1's
 *    first push: vitest passed but tsc failed in CI.
 * 3. Bump package.json, commit, tag, push.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const bump = process.argv[2];
if (!bump || !["patch", "minor", "major"].includes(bump)) {
  console.error("Usage: pnpm release <patch|minor|major>");
  process.exit(1);
}

// Compute the target version up front so guards can reference it without
// mutating package.json (the old script bumped first, then had to revert on
// every guard failure — and self-aborted because its own bump dirtied the tree).
const current = JSON.parse(readFileSync("package.json", "utf-8")).version;
const parts = current.split(".").map(Number);
const newVersion =
  bump === "major"
    ? `${parts[0] + 1}.0.0`
    : bump === "minor"
      ? `${parts[0]}.${parts[1] + 1}.0`
      : `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
console.log(`Releasing v${current} → v${newVersion}`);

// ── Pre-flight guards (nothing mutated yet) ────────────────────────────
const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
if (branch !== "main") {
  console.error(`ERROR: Expected main branch, got ${branch}. Switch to main first.`);
  process.exit(1);
}

const status = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
if (status) {
  console.error("ERROR: Working tree is dirty. Commit or stash before releasing.");
  process.exit(1);
}

const changelog = readFileSync("CHANGELOG.md", "utf-8");
const heading = `## v${newVersion}`;
if (!changelog.includes(heading)) {
  console.error(`ERROR: CHANGELOG.md does not contain entry for v${newVersion}`);
  console.error(`Expected heading: ${heading}`);
  process.exit(1);
}
console.log("✓ Pre-flight: on main, clean tree, CHANGELOG entry present");

// ── Full local gate (must pass before we touch anything) ───────────────
console.log("\n▶ Running local gate: prepare → typecheck → test → build");
try {
  execSync("pnpm wxt prepare", { stdio: "inherit" });
  execSync("pnpm typecheck", { stdio: "inherit" });
  execSync("pnpm test", { stdio: "inherit" });
  execSync("pnpm build", { stdio: "inherit" });
} catch {
  console.error("\n✗ Local gate failed — release aborted, nothing was mutated.");
  process.exit(1);
}
console.log("✓ Local gate passed");

// ── Bump, commit, tag, push ────────────────────────────────────────────
execSync(`npm version ${bump} --no-git-tag-version`, { stdio: "inherit" });
execSync("git add package.json CHANGELOG.md", { stdio: "inherit" });
execSync(`git commit -m "release: v${newVersion}"`, { stdio: "inherit" });
execSync(`git tag v${newVersion}`, { stdio: "inherit" });
execSync("git push origin main --tags", { stdio: "inherit" });

console.log(`\n✓ Released v${newVersion}`);
console.log("  CI will build and create GitHub Release automatically.");
