// @vitest-environment jsdom
const _lsStore: Record<string, string> = vi.hoisted(() => {
  const store: Record<string, string> = {};
  const shim = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
  globalThis.localStorage = shim as Storage;
  return store;
});

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AllProviders } from "@/tests/helpers/render-utils";

const mockCreateSession = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/capture", () => ({
  captureCurrentPageInfo: vi.fn().mockResolvedValue({
    url: "https://example.com",
    title: "Example",
    faviconUrl: "https://example.com/favicon.ico",
  }),
}));

vi.mock("@/hooks/useActiveSession", () => ({
  useActiveSession: () => ({ createSession: mockCreateSession }),
}));

vi.mock("@/hooks/useFocus", () => ({
  useFocusTrap: () => {},
  useAutoFocus: () => {},
}));

vi.mock("@/stores/toast", () => ({
  toastError: vi.fn(),
}));

import NewSessionModal from "@/components/NewSessionModal";

afterEach(() => {
  cleanup();
  mockCreateSession.mockClear();
});

function renderModal(onClose = vi.fn()) {
  return render(
    <AllProviders>
      <NewSessionModal onClose={onClose} />
    </AllProviders>,
  );
}

describe("NewSessionModal", () => {
  it("renders modal with tool name and URL inputs", () => {
    renderModal();
    expect(screen.getByText("Tool Name *")).toBeTruthy();
    expect(screen.getByText("Tool URL *")).toBeTruthy();
    expect(screen.getByText("New Review")).toBeTruthy();
  });

  it("submit button is disabled when fields are empty", () => {
    renderModal();
    const btn = screen.getByText("Start Review");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("submit button enables when both fields are filled", async () => {
    renderModal();
    const inputs = screen.getAllByRole("textbox");
    const [nameInput, urlInput] = inputs;
    fireEvent.change(nameInput, { target: { value: "Test Tool" } });
    fireEvent.change(urlInput, { target: { value: "https://test.com" } });
    const btn = screen.getByText("Start Review");
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
  });

  it("form submission calls createSession", async () => {
    renderModal();
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Test Tool" } });
    fireEvent.change(inputs[1], { target: { value: "https://test.com" } });
    fireEvent.submit(inputs[0].closest("form")!);
    await waitFor(() => expect(mockCreateSession).toHaveBeenCalledOnce());
    const callArg = mockCreateSession.mock.calls[0][0];
    expect(callArg.toolName).toBe("Test Tool");
    expect(callArg.toolUrl).toBe("https://test.com");
  });

  it("Escape key calls onClose", () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
