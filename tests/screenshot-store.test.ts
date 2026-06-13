import { afterEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import {
  deleteAllScreenshots,
  deleteScreenshot,
  deleteScreenshotsForCaptures,
  loadAllScreenshots,
  loadScreenshot,
  saveAnnotatedScreenshot,
  saveScreenshot,
} from "@/lib/screenshot-store";
import type { Capture } from "@/lib/types";

function makeCapture(overrides: Partial<Capture> = {}): Capture {
  return {
    id: "cap-1",
    timestamp: new Date().toISOString(),
    sourceUrl: "https://example.com",
    pageTitle: "Test Page",
    screenshotBase64: "data:image/png;base64,testdata",
    htmlContent: "<html></html>",
    notes: "",
    ...overrides,
  };
}

describe("screenshot-store", () => {
  afterEach(async () => {
    await deleteAllScreenshots();
  });

  it("saveScreenshot + loadScreenshot round-trip", async () => {
    const capture = makeCapture({
      id: "cap-rt",
      screenshotBase64: "data:image/png;base64,abc",
    });
    await saveScreenshot(capture);

    const blob = await loadScreenshot("cap-rt");
    expect(blob).not.toBeNull();
    expect(blob?.id).toBe("cap-rt");
    expect(blob?.screenshotBase64).toBe("data:image/png;base64,abc");
    expect(blob?.annotatedScreenshotBase64).toBeUndefined();
  });

  it("saveScreenshot with annotation preserves both fields", async () => {
    const capture = makeCapture({
      id: "cap-ann",
      screenshotBase64: "data:image/png;base64,orig",
      annotatedScreenshotBase64: "data:image/png;base64,annotated",
    });
    await saveScreenshot(capture);

    const blob = await loadScreenshot("cap-ann");
    expect(blob).not.toBeNull();
    expect(blob?.screenshotBase64).toBe("data:image/png;base64,orig");
    expect(blob?.annotatedScreenshotBase64).toBe("data:image/png;base64,annotated");
  });

  it("loadScreenshot returns null for missing ID", async () => {
    const blob = await loadScreenshot("nonexistent");
    expect(blob).toBeNull();
  });

  it("loadAllScreenshots returns all saved entries", async () => {
    await saveScreenshot(makeCapture({ id: "b1", screenshotBase64: "data:1" }));
    await saveScreenshot(makeCapture({ id: "b2", screenshotBase64: "data:2" }));
    await saveScreenshot(makeCapture({ id: "b3", screenshotBase64: "data:3" }));

    const map = await loadAllScreenshots(["b1", "b2", "b3"]);
    expect(map.size).toBe(3);
    expect(map.get("b1")?.screenshotBase64).toBe("data:1");
    expect(map.get("b2")?.screenshotBase64).toBe("data:2");
    expect(map.get("b3")?.screenshotBase64).toBe("data:3");
  });

  it("loadAllScreenshots with empty array returns empty Map", async () => {
    const map = await loadAllScreenshots([]);
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(0);
  });

  it("loadAllScreenshots skips missing IDs", async () => {
    await saveScreenshot(makeCapture({ id: "exists", screenshotBase64: "data:x" }));

    const map = await loadAllScreenshots(["exists", "missing"]);
    expect(map.size).toBe(1);
    expect(map.has("exists")).toBe(true);
    expect(map.has("missing")).toBe(false);
  });

  it("deleteScreenshot removes entry", async () => {
    await saveScreenshot(makeCapture({ id: "cap-del" }));
    expect(await loadScreenshot("cap-del")).not.toBeNull();

    await deleteScreenshot("cap-del");
    expect(await loadScreenshot("cap-del")).toBeNull();
  });

  it("saveAnnotatedScreenshot updates existing entry", async () => {
    await saveScreenshot(makeCapture({ id: "cap-sa", screenshotBase64: "data:orig" }));

    await saveAnnotatedScreenshot("cap-sa", "data:image/png;base64,annotation");

    const blob = await loadScreenshot("cap-sa");
    expect(blob).not.toBeNull();
    expect(blob?.screenshotBase64).toBe("data:orig");
    expect(blob?.annotatedScreenshotBase64).toBe("data:image/png;base64,annotation");
  });

  it("saveAnnotatedScreenshot creates entry if missing", async () => {
    await saveAnnotatedScreenshot("cap-new", "data:image/png;base64,new-ann");

    const blob = await loadScreenshot("cap-new");
    expect(blob).not.toBeNull();
    expect(blob?.id).toBe("cap-new");
    expect(blob?.screenshotBase64).toBe("");
    expect(blob?.annotatedScreenshotBase64).toBe("data:image/png;base64,new-ann");
  });

  it("deleteScreenshotsForCaptures removes only specified IDs", async () => {
    await saveScreenshot(makeCapture({ id: "d1" }));
    await saveScreenshot(makeCapture({ id: "d2" }));
    await saveScreenshot(makeCapture({ id: "d3" }));

    await deleteScreenshotsForCaptures(["d1", "d2"]);

    expect(await loadScreenshot("d1")).toBeNull();
    expect(await loadScreenshot("d2")).toBeNull();
    expect(await loadScreenshot("d3")).not.toBeNull();
  });

  it("deleteScreenshotsForCaptures with empty array is a no-op", async () => {
    await saveScreenshot(makeCapture({ id: "keep" }));
    await deleteScreenshotsForCaptures([]);
    expect(await loadScreenshot("keep")).not.toBeNull();
  });

  it("deleteAllScreenshots clears everything", async () => {
    await saveScreenshot(makeCapture({ id: "a1" }));
    await saveScreenshot(makeCapture({ id: "a2" }));

    await deleteAllScreenshots();

    expect(await loadScreenshot("a1")).toBeNull();
    expect(await loadScreenshot("a2")).toBeNull();
  });
});
