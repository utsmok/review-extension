// Read package.json version and emit a shields.io endpoint badge JSON.
// Published to the orphan `badges` branch by .github/workflows/badges.yml, so the
// README "version" badge stays in sync without depending on the GitHub API
// (which rate-limits under shields.io's shared token pool).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));

const badge = {
  schemaVersion: 1,
  label: "version",
  message: version,
  color: "8e036c",
};

const out = process.argv[2] ?? "version.json";
writeFileSync(out, `${JSON.stringify(badge, null, 2)}\n`);
console.log(`Wrote ${out}: ${version}`);
