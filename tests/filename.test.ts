import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "@/lib/filename";

describe("sanitizeFilename", () => {
  it("passes through safe names unchanged", () => {
    expect(sanitizeFilename("MyTool")).toBe("MyTool");
    expect(sanitizeFilename("Google Search")).toBe("Google Search");
    expect(sanitizeFilename("tool-v2")).toBe("tool-v2");
  });

  it("replaces path separators", () => {
    expect(sanitizeFilename("foo/bar")).toBe("foo_bar");
    expect(sanitizeFilename("foo\\bar")).toBe("foo_bar");
    expect(sanitizeFilename("../../evil")).toBe("_._evil");
  });

  it("replaces Windows-invalid characters", () => {
    expect(sanitizeFilename('a<b>c:d"e|f?g*h')).toBe("a_b_c_d_e_f_g_h");
  });

  it("strips leading dots", () => {
    expect(sanitizeFilename(".hidden")).toBe("hidden");
    expect(sanitizeFilename("..parent")).toBe("parent");
  });

  it("collapses multiple dots", () => {
    expect(sanitizeFilename("foo...bar")).toBe("foo.bar");
  });

  it("returns fallback for empty/whitespace-only names", () => {
    expect(sanitizeFilename("")).toBe("review");
    expect(sanitizeFilename("   ")).toBe("review");
  });

  it("strips null bytes and control characters", () => {
    expect(sanitizeFilename("foo\x00bar\x01baz")).toBe("foo_bar_baz");
  });
});
