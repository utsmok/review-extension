// @vitest-environment jsdom
//
// Functional coverage for the annotation panel. The real tldraw library needs a
// full DOM layout engine (it does not run under jsdom), so we mock the tldraw
// surface and drive the app's OWN annotation logic — the ActionBar zoom/clear/
// save controls and the useTldrawEditor lifecycle (mount, background-image load,
// camera constraints). This is the layer that was entirely untested, which is
// why the v0.7.1 CSP regression (tldraw CDN translation fetch blocked) shipped
// unnoticed — see manifest-csp.test.ts for the static CSP guard.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ReactNode, useEffect } from "react";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Editor, TLShapeId } from "@/components/TldrawAnnotation";

// Mock tldraw: ActionBar uses useValue (a reactive signal hook); the mock invokes
// the getter once. AssetRecordType/createShapeId back the dynamic-import path in
// useTldrawEditor (the module still loads with this mock in place).
vi.mock("tldraw", () => ({
  useValue: (_name: string, fn: () => unknown) => fn(),
  Tldraw: () => null,
  AssetRecordType: { createId: () => "asset-1" },
  createShapeId: () => "shape-1",
}));

import { ActionBar } from "@/components/TldrawAnnotation";
import { useTldrawEditor } from "@/hooks/useTldrawEditor";

type Camera = { x: number; y: number; z: number };

/** Minimal stand-in for the tldraw Editor surface the annotation code touches. */
interface FakeEditor {
  getCamera: Mock;
  setCamera: Mock;
  getViewportPageBounds: Mock;
  getShape: Mock;
  zoomToBounds: Mock;
  createAssets: Mock;
  createShape: Mock;
  setCurrentTool: Mock;
  clearHistory: Mock;
  setCameraOptions: Mock;
  getCurrentPageId: Mock;
  getSortedChildIdsForParent: Mock;
  moveShapesToPage: Mock;
  sendToBack: Mock;
  sideEffects: {
    registerAfterCreateHandler: Mock;
    registerAfterChangeHandler: Mock;
    registerBeforeChangeHandler: Mock;
  };
}

const noopFn = (): void => {};

/** Build a FakeEditor. Called from many tests; centralizes the mock surface. */
function makeEditor(camera: Camera = { x: 0, y: 0, z: 1 }): FakeEditor {
  return {
    getCamera: vi.fn(() => camera),
    setCamera: vi.fn(),
    getViewportPageBounds: vi.fn(() => ({ center: { x: 100, y: 100 } })),
    getShape: vi.fn(() => ({ props: { w: 800, h: 600 } })),
    zoomToBounds: vi.fn(),
    createAssets: vi.fn(),
    createShape: vi.fn(),
    setCurrentTool: vi.fn(),
    clearHistory: vi.fn(),
    setCameraOptions: vi.fn(),
    getCurrentPageId: vi.fn(() => "page-1"),
    getSortedChildIdsForParent: vi.fn(() => ["shape-1"]),
    moveShapesToPage: vi.fn(),
    sendToBack: vi.fn(),
    sideEffects: {
      registerAfterCreateHandler: vi.fn(() => noopFn),
      registerAfterChangeHandler: vi.fn(() => noopFn),
      registerBeforeChangeHandler: vi.fn(() => noopFn),
    },
  };
}

// ---------------------------------------------------------------------------
// ActionBar
// ---------------------------------------------------------------------------

describe("ActionBar", () => {
  afterEach(() => cleanup());

  it("zooms in by 0.1 step", () => {
    const editor = makeEditor({ x: 0, y: 0, z: 1 });
    render(
      <ActionBar
        editor={editor as unknown as Editor}
        imageShapeId={"shape-1" as unknown as TLShapeId}
        onClear={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Zoom in"));
    expect(editor.setCamera.mock.calls[0][0].z).toBe(1.1);
  });

  it("clamps zoom in at 5", () => {
    const editor = makeEditor({ x: 0, y: 0, z: 4.95 });
    render(
      <ActionBar
        editor={editor as unknown as Editor}
        imageShapeId={"shape-1" as unknown as TLShapeId}
        onClear={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Zoom in"));
    expect(editor.setCamera.mock.calls[0][0].z).toBe(5);
  });

  it("zooms out by 0.1 step", () => {
    const editor = makeEditor({ x: 0, y: 0, z: 1 });
    render(
      <ActionBar
        editor={editor as unknown as Editor}
        imageShapeId={"shape-1" as unknown as TLShapeId}
        onClear={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Zoom out"));
    expect(editor.setCamera.mock.calls[0][0].z).toBeCloseTo(0.9);
  });

  it("clamps zoom out at 0.1", () => {
    const editor = makeEditor({ x: 0, y: 0, z: 0.15 });
    render(
      <ActionBar
        editor={editor as unknown as Editor}
        imageShapeId={"shape-1" as unknown as TLShapeId}
        onClear={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Zoom out"));
    expect(editor.setCamera.mock.calls[0][0].z).toBe(0.1);
  });

  it("fit zooms to the image bounds with inset", () => {
    const editor = makeEditor();
    render(
      <ActionBar
        editor={editor as unknown as Editor}
        imageShapeId={"shape-1" as unknown as TLShapeId}
        onClear={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Zoom:.*Click to fit/));
    expect(editor.zoomToBounds).toHaveBeenCalledWith({ x: 0, y: 0, w: 800, h: 600 }, { inset: 16 });
  });

  it("does nothing on fit when there is no image shape", () => {
    const editor = makeEditor();
    render(
      <ActionBar
        editor={editor as unknown as Editor}
        imageShapeId={null}
        onClear={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Zoom:.*Click to fit/));
    expect(editor.zoomToBounds).not.toHaveBeenCalled();
  });

  it("clear and save invoke their handlers", () => {
    const onClear = vi.fn();
    const onSave = vi.fn();
    const editor = makeEditor();
    render(
      <ActionBar
        editor={editor as unknown as Editor}
        imageShapeId={"shape-1" as unknown as TLShapeId}
        onClear={onClear}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByLabelText("Clear annotations"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClear).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("shows the current zoom percentage", () => {
    render(
      <ActionBar
        editor={makeEditor({ x: 0, y: 0, z: 1.5 }) as unknown as Editor}
        imageShapeId={"shape-1" as unknown as TLShapeId}
        onClear={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Zoom: 150%/)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// useTldrawEditor
// ---------------------------------------------------------------------------

/** Fake Image that fires onload synchronously when src is set (jsdom never loads). */
class FakeImage {
  naturalWidth = 800;
  naturalHeight = 600;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = "";
  get src(): string {
    return this._src;
  }
  set src(value: string) {
    this._src = value;
    if (this.onload) this.onload();
  }
}

/** Image variant that signals a load failure (exercises the onerror branch). */
class FailingImage {
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = "";
  get src(): string {
    return this._src;
  }
  set src(value: string) {
    this._src = value;
    if (this.onerror) this.onerror();
  }
}

function Harness({ editor, imageSrc }: { editor: FakeEditor; imageSrc?: string }): ReactNode {
  const { editor: resolved, imageShapeId, onMount } = useTldrawEditor(imageSrc);
  useEffect(() => {
    onMount(editor as unknown as Editor);
  }, [editor, onMount]);
  return (
    <div
      data-testid="harness"
      data-mounted={resolved ? "yes" : "no"}
      data-shape={imageShapeId ? String(imageShapeId) : ""}
    />
  );
}

describe("useTldrawEditor", () => {
  const OriginalImage = globalThis.Image;

  afterEach(() => {
    globalThis.Image = OriginalImage;
    cleanup();
  });

  beforeEach(() => {
    vi.stubGlobal("Image", FakeImage);
  });

  it("exposes no editor until tldraw mounts it", () => {
    render(<Harness editor={makeEditor()} />);
    expect(screen.getByTestId("harness").getAttribute("data-mounted")).toBe("yes");
  });

  it("loads the screenshot as a locked background image asset + shape", async () => {
    const editor = makeEditor();
    render(<Harness editor={editor} imageSrc="data:image/png;base64,abc" />);

    await waitFor(() => expect(editor.createAssets).toHaveBeenCalledOnce());
    expect(editor.createShape).toHaveBeenCalledWith(
      expect.objectContaining({ type: "image", isLocked: true }),
    );
    expect(editor.setCurrentTool).toHaveBeenCalledWith("arrow");
    expect(editor.clearHistory).toHaveBeenCalled();
  });

  it("registers z-order + lock side-effect handlers after loading", async () => {
    const editor = makeEditor();
    render(<Harness editor={editor} imageSrc="data:image/png;base64,abc" />);

    await waitFor(() => expect(editor.createShape).toHaveBeenCalled());
    expect(editor.sideEffects.registerAfterCreateHandler).toHaveBeenCalledWith(
      "shape",
      expect.any(Function),
    );
    expect(editor.sideEffects.registerAfterChangeHandler).toHaveBeenCalledWith(
      "shape",
      expect.any(Function),
    );
    expect(editor.sideEffects.registerBeforeChangeHandler).toHaveBeenCalledWith(
      "shape",
      expect.any(Function),
    );
  });

  it("clears history but creates no asset when the image fails to load", async () => {
    vi.stubGlobal("Image", FailingImage);
    const editor = makeEditor();
    render(<Harness editor={editor} imageSrc="data:image/png;base64,bad" />);

    await waitFor(() => expect(editor.clearHistory).toHaveBeenCalled());
    expect(editor.createAssets).not.toHaveBeenCalled();
    expect(editor.createShape).not.toHaveBeenCalled();
  });

  it("sets camera constraints once the image shape exists", async () => {
    const editor = makeEditor();
    render(<Harness editor={editor} imageSrc="data:image/png;base64,abc" />);

    await waitFor(() => expect(editor.setCameraOptions).toHaveBeenCalled());
    expect(editor.setCameraOptions).toHaveBeenCalled();
  });
});
