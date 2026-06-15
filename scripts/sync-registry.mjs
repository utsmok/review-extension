// Sync the canonical tool registry (data/tools/registry.json) into the static
// conference site (site/data/tools/registry.json). The site fetches its own copy
// at runtime, so the two must stay in lockstep. Edit data/tools/registry.json,
// then run `pnpm sync-registry`. A vitest guard (tests/registry-sync.test.ts)
// fails CI if they drift.
import { copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
copyFileSync(
  resolve(root, "data/tools/registry.json"),
  resolve(root, "site/data/tools/registry.json"),
);
console.log("Synced data/tools/registry.json → site/data/tools/registry.json");
