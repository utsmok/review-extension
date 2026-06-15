import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The static conference site (site/) fetches its own copy of the tool registry at
// runtime, while the extension imports the canonical copy in data/tools/. The two
// must never drift. Edit data/tools/registry.json, then run `pnpm sync-registry`.
describe("tool registry single-source", () => {
  it("site copy matches the canonical registry", () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const canonical = readFileSync(resolve(root, "data/tools/registry.json"), "utf-8");
    const siteCopy = readFileSync(resolve(root, "site/data/tools/registry.json"), "utf-8");
    expect(
      siteCopy,
      "site/data/tools/registry.json drifted from data/tools/registry.json — run `pnpm sync-registry`.",
    ).toBe(canonical);
  });
});
