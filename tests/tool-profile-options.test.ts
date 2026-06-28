import { describe, expect, it } from "vitest";
import { TOOL_REGISTRY } from "@/data/tools";
import { getField } from "@/lib/field-schema";
import {
  AUTH_METHOD_OPTIONS,
  DATA_SOURCE_OPTIONS,
  DISCIPLINE_OPTIONS,
  SEARCH_METHOD_OPTIONS,
} from "@/lib/metadata-options";

/**
 * Task 7 guard: every auto-populated value in the tool registry must exactly
 * match a canonical option from the field descriptor's option list.
 * Orphan "custom" pills break filtering, export, and sharing.
 */
describe("tool registry defaults match canonical field options", () => {
  it("every dataSources value is in DATA_SOURCE_OPTIONS", () => {
    for (const tool of TOOL_REGISTRY) {
      for (const val of tool.defaults.dataSources ?? []) {
        expect(
          DATA_SOURCE_OPTIONS.includes(val as (typeof DATA_SOURCE_OPTIONS)[number]),
          `${tool.name}: dataSources "${val}" is not a canonical DATA_SOURCE option`,
        ).toBe(true);
      }
    }
  });

  it("every searchMethods value is in SEARCH_METHOD_OPTIONS", () => {
    for (const tool of TOOL_REGISTRY) {
      for (const val of tool.defaults.searchMethods ?? []) {
        expect(
          SEARCH_METHOD_OPTIONS.includes(val as (typeof SEARCH_METHOD_OPTIONS)[number]),
          `${tool.name}: searchMethods "${val}" is not a canonical SEARCH_METHOD option`,
        ).toBe(true);
      }
    }
  });

  it("every discipline value is in DISCIPLINE_OPTIONS", () => {
    for (const tool of TOOL_REGISTRY) {
      for (const val of tool.defaults.discipline ?? []) {
        expect(
          DISCIPLINE_OPTIONS.includes(val as (typeof DISCIPLINE_OPTIONS)[number]),
          `${tool.name}: discipline "${val}" is not a canonical DISCIPLINE option`,
        ).toBe(true);
      }
    }
  });

  it("authenticationMethod is in AUTH_METHOD_OPTIONS when present", () => {
    for (const tool of TOOL_REGISTRY) {
      const val = tool.defaults.authenticationMethod;
      if (val !== undefined) {
        expect(
          AUTH_METHOD_OPTIONS.includes(val as (typeof AUTH_METHOD_OPTIONS)[number]),
          `${tool.name}: authenticationMethod "${val}" is not a canonical AUTH_METHOD option`,
        ).toBe(true);
      }
    }
  });

  it("registry autoPopulate keys map to real field descriptors", () => {
    // The autoPopulateKey values used by tool profiles must correspond to
    // field IDs in the framework config. Verify the known keys exist.
    const autoPopulateKeys = [
      "company",
      "usesAi",
      "pricing",
      "availability",
      "authenticationMethod",
      "dataSources",
      "searchMethods",
      "discipline",
    ] as const;

    for (const key of autoPopulateKeys) {
      expect(
        () => getField(key),
        `autoPopulateKey "${key}" has no matching field descriptor`,
      ).not.toThrow();
    }
  });
});
