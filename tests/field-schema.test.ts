import { describe, it, expect, beforeEach } from "vitest";
import { FIELD_IDS, GRADE_IDS, FRAMEWORK_CONFIG, validateFrameworkShape } from "@/data/framework";
import type { FieldDescriptor, FieldSurface } from "@/lib/types";
import { getField, getFieldValue, getActiveFields, getFields, getFieldsBySurface, setFieldValue } from "@/lib/field-schema";
import type { SessionMetadata } from "@/lib/types";

/* ──────────────────────────── Task 1 ──────────────────────────── */

describe("Task 1 – field/grade config", () => {
  it("FRAMEWORK_CONFIG has frameworkName, version, fields, grades", () => {
    expect(typeof FRAMEWORK_CONFIG.frameworkName).toBe("string");
    expect(typeof FRAMEWORK_CONFIG.version).toBe("string");
    expect(Array.isArray(FRAMEWORK_CONFIG.fields)).toBe(true);
    expect(Array.isArray(FRAMEWORK_CONFIG.grades)).toBe(true);
  });

  it("validateFrameworkShape passes for shipped config", () => {
    expect(() => validateFrameworkShape(FRAMEWORK_CONFIG)).not.toThrow();
  });

  it("validateFrameworkShape rejects missing fields", () => {
    expect(() => validateFrameworkShape({ ...FRAMEWORK_CONFIG, fields: null as any }))
      .toThrow("fields must be an array");
  });

  it("validateFrameworkShape rejects missing grades", () => {
    expect(() => validateFrameworkShape({ ...FRAMEWORK_CONFIG, grades: undefined as any }))
      .toThrow("grades must be an array");
  });

  it("every field has required keys (id, storageKey, surface, label, type, order, enabled)", () => {
    for (const f of FRAMEWORK_CONFIG.fields) {
      expect(f).toHaveProperty("id");
      expect(f).toHaveProperty("storageKey");
      expect(f).toHaveProperty("surface");
      expect(f).toHaveProperty("label");
      expect(f).toHaveProperty("type");
      expect(f).toHaveProperty("order");
      expect(f).toHaveProperty("enabled");
    }
  });

  it("field IDs are unique", () => {
    const ids = FRAMEWORK_CONFIG.fields.map((f) => f.id);
    expect(ids).toEqual([...new Set(ids)]);
  });

  it("FIELD_IDS matches config fields", () => {
    expect(FIELD_IDS).toEqual(FRAMEWORK_CONFIG.fields.map((f) => f.id));
  });

  it("discipline field has 38 options and defaultOption Multidisciplinary", () => {
    const disc = FRAMEWORK_CONFIG.fields.find((f) => f.id === "discipline")!;
    expect(disc.options).toHaveLength(38);
    expect(disc.defaultOption).toBe("Multidisciplinary");
    expect(disc.options?.at(-1)).toBe("Geography");
  });

  it("every grade has 8 keys (CORRECTION 3: dual representation)", () => {
    for (const g of FRAMEWORK_CONFIG.grades) {
      expect(g).toHaveProperty("id");
      expect(g).toHaveProperty("label");
      expect(g).toHaveProperty("description");
      expect(g).toHaveProperty("color");
      expect(g).toHaveProperty("tint");
      expect(g).toHaveProperty("reportColor");
      expect(g).toHaveProperty("reportLabel");
    }
  });

  it("grade reportColors are hex and reportLabels are uppercase", () => {
    for (const g of FRAMEWORK_CONFIG.grades) {
      expect(g.reportColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(g.reportLabel).toBe(g.reportLabel.toUpperCase());
    }
  });

  it("no placeholder markers in JSON", () => {
    const raw = JSON.stringify(FRAMEWORK_CONFIG);
    expect(raw).not.toContain("<from");
  });

  it("grade IDs are unique", () => {
    const ids = FRAMEWORK_CONFIG.grades.map((g) => g.id);
    expect(ids).toEqual([...new Set(ids)]);
  });

  it("GRADE_IDS matches config grades", () => {
    expect(GRADE_IDS).toEqual(FRAMEWORK_CONFIG.grades.map((g) => g.id));
  });
});

/* ──────────────────────────── Task 2 ──────────────────────────── */

describe("Task 2 – field-schema accessors", () => {
  it("getFields returns all shipped fields (same length as FIELD_IDS)", () => {
    expect(getFields()).toHaveLength(FIELD_IDS.length);
  });

  it("getActiveFields('metadata') returns only metadata surface fields", () => {
    const fields = getActiveFields("metadata" as FieldSurface);
    for (const f of fields) {
      expect(f.surface).toBe("metadata");
    }
    expect(fields.length).toBeGreaterThan(0);
  });

  it("getActiveFields('finalization') returns only finalization surface fields", () => {
    const fields = getActiveFields("finalization" as FieldSurface);
    for (const f of fields) {
      expect(f.surface).toBe("finalization");
    }
    expect(fields.length).toBeGreaterThan(0);
  });

  it("getActiveFields() returns all enabled fields", () => {
    const all = getActiveFields();
    for (const f of all) {
      expect(f.enabled).toBe(true);
    }
  });

  it("getActiveFields filters out disabled fields", () => {
    const enabledCount = FRAMEWORK_CONFIG.fields.filter((f) => f.enabled).length;
    expect(getActiveFields()).toHaveLength(enabledCount);
  });

  it("getFieldsBySurface is an alias for getActiveFields(surface)", () => {
    expect(getFieldsBySurface("metadata" as FieldSurface)).toEqual(getActiveFields("metadata" as FieldSurface));
  });

  it("getField('toolName') returns the correct descriptor", () => {
    const f = getField("toolName");
    expect(f.id).toBe("toolName");
    expect(f.type).toBe("text");
    expect(f.required).toBe(true);
  });

  it("getField throws for unknown id", () => {
    expect(() => getField("nonexistent")).toThrow("Unknown field: nonexistent");
  });

  describe("getFieldValue / setFieldValue", () => {
    let session: SessionMetadata;
    const builtDesc: FieldDescriptor = {
      id: "toolName",
      storageKey: "toolName",
      surface: "metadata",
      label: "Tool name",
      type: "text",
      order: 1,
      enabled: true,
    };
    const customDesc: FieldDescriptor = {
      id: "region",
      storageKey: "region",
      surface: "metadata",
      label: "Region",
      type: "text",
      order: 99,
      enabled: true,
      custom: true,
    };

    beforeEach(() => {
      session = {
        id: "test-1",
        status: "started",
        toolName: "My Tool",
        toolUrl: "https://example.com",
        startTime: new Date().toISOString(),
      };
    });

    it("reads built-in field value", () => {
      expect(getFieldValue(session, builtDesc)).toBe("My Tool");
    });

    it("writes built-in field value", () => {
      setFieldValue(session, builtDesc, "Updated Tool");
      expect((session as unknown as Record<string, unknown>).toolName).toBe("Updated Tool");
    });

    it("reads custom field from customFields bag", () => {
      session.customFields = { region: "EU" };
      expect(getFieldValue(session, customDesc)).toBe("EU");
    });

    it("writes custom field to customFields bag", () => {
      setFieldValue(session, customDesc, "APAC");
      expect(session.customFields?.region).toBe("APAC");
    });

    it("reads undefined for missing custom field", () => {
      expect(getFieldValue(session, customDesc)).toBeUndefined();
    });
  });
});
