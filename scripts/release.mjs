#!/usr/bin/env node
/**
 * Release automation script.
 * Usage: pnpm release <patch|minor|major>
 *
 * Validates CHANGELOG has an entry for the new version,
 * bumps package.json, commits, tags, and pushes.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const bump = process.argv[2];
if (!bump || !["patch", "minor", "major"].includes(bump)) {
  console.error("Usage: pnpm release <patch|minor|major>");
  process.exit(1);
}

// Read current version
const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const current = pkg.version;
console.log(`Current version: ${current}`);

// Bump version
const newVersion = execSync(`npm version ${bump} --no-git-tag-version`, { encoding: "utf-8" })
  .trim()
  .replace("v", "");
console.log(`New version: ${newVersion}`);

// Verify CHANGELOG has entry
const changelog = readFileSync("CHANGELOG.md", "utf-8");
const heading = `## v${newVersion}`;
if (!changelog.includes(heading)) {
  console.error(`ERROR: CHANGELOG.md does not contain entry for v${newVersion}`);
  console.error(`Expected heading: ${heading}`);
  // Revert version bump
  pkg.version = current;
  writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
  process.exit(1);
}
console.log("✓ CHANGELOG entry found");

// Commit, tag, push
execSync("git add package.json CHANGELOG.md", { stdio: "inherit" });
execSync(`git commit -m "release: v${newVersion}"`, { stdio: "inherit" });
execSync(`git tag v${newVersion}`, { stdio: "inherit" });
execSync("git push origin main --tags", { stdio: "inherit" });

console.log(`\n✓ Released v${newVersion}`);
console.log("  CI will build and create GitHub Release automatically.");
