// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CaptureImg from "@/components/captures/CaptureImg";
import { makeCapture, TINY_PNG } from "@/tests/fixtures";

afterEach(cleanup);

vi.mock("@/hooks/useScreenshotUrl", () => ({
  useScreenshotUrl: (_id: string) => null,
}));

describe("CaptureImg", () => {
  it("renders an <img> element", () => {
    render(<CaptureImg capture={makeCapture()} />);
    expect(document.querySelector("img")).toBeTruthy();
  });

  it("uses screenshotBase64 from the capture as src", () => {
    render(<CaptureImg capture={makeCapture({ screenshotBase64: TINY_PNG })} />);
    const img = document.querySelector("img")!;
    expect(img.src).toContain("data:image/png");
  });

  it("falls back to annotatedScreenshotBase64 when screenshotBase64 is missing", () => {
    render(
      <CaptureImg
        capture={makeCapture({
          screenshotBase64: undefined,
          annotatedScreenshotBase64: TINY_PNG,
        })}
      />,
    );
    const img = document.querySelector("img")!;
    expect(img.src).toContain("data:image/png");
  });

  it("prefers annotatedScreenshotBase64 over screenshotBase64", () => {
    const annotated =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    render(
      <CaptureImg
        capture={makeCapture({
          screenshotBase64: TINY_PNG,
          annotatedScreenshotBase64: annotated,
        })}
      />,
    );
    const img = document.querySelector("img")!;
    expect(img.src).toContain("data:image/gif");
  });

  it("sets alt text from pageTitle, falling back to sourceUrl", () => {
    const { rerender } = render(<CaptureImg capture={makeCapture({ pageTitle: "Home" })} />);
    expect(document.querySelector("img")!.alt).toBe("Screenshot of Home");

    rerender(
      <CaptureImg capture={makeCapture({ pageTitle: "", sourceUrl: "https://example.com" })} />,
    );
    expect(document.querySelector("img")!.alt).toBe("Screenshot of https://example.com");
  });

  it("applies the provided className", () => {
    render(<CaptureImg capture={makeCapture()} className="w-full" />);
    expect(document.querySelector("img")!.className).toContain("w-full");
  });

  it("sets loading attribute to lazy", () => {
    render(<CaptureImg capture={makeCapture()} />);
    expect(document.querySelector("img")!.getAttribute("loading")).toBe("lazy");
  });
});
