// @vitest-environment jsdom

// Zustand persist captures `window.localStorage` at import time.
// WxtVitest's jsdom provides a broken localStorage — stub it BEFORE store imports.
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

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { makeMetadata } from "@/tests/fixtures";
import { AllProviders } from "@/tests/helpers/render-utils";

// Mock auto-save to avoid side effects
vi.mock("@/lib/auto-save", () => ({
  initAutoSave: vi.fn(),
  teardownAutoSave: vi.fn(),
}));

// Mock session-lifecycle to avoid IndexedDB access
vi.mock("@/lib/session-lifecycle", () => ({
  saveCurrentSession: vi.fn(),
  loadSessionById: vi.fn(),
  markDoneAndClose: vi.fn(),
  switchToSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  exportSessionById: vi.fn(),
  importSessionFromZipFile: vi.fn(),
}));

// Mock session-repository to avoid IndexedDB
vi.mock("@/lib/session-repository", () => ({
  getRepository: () => ({ save: vi.fn(), load: vi.fn(), delete: vi.fn() }),
}));

// Mock export utilities
vi.mock("@/lib/export", () => ({
  downloadBlob: vi.fn(),
  sanitizeFilename: (s: string) => s,
}));

// Mock toast
vi.mock("@/stores/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));

import SessionManager from "@/components/SessionManager";
import { deleteSession, switchToSession } from "@/lib/session-lifecycle";

function renderSessionManager() {
  return render(<SessionManager />, { wrapper: AllProviders });
}

function seedSessions(...metas: ReturnType<typeof makeMetadata>[]) {
  const sessionIndex: Record<string, ReturnType<typeof makeMetadata>> = {};
  for (const m of metas) sessionIndex[m.id] = m;
  useRegistryStore.setState({ sessionIndex, activeSessionId: null });
}

describe("SessionManager", () => {
  beforeEach(() => {
    localStorage.clear();
    useRegistryStore.setState({
      sessionIndex: {},
      activeSessionId: null,
    });
    useSessionStore.getState().clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows empty state when no sessions exist", () => {
    renderSessionManager();

    expect(screen.getByText("No reviews yet")).toBeDefined();
    expect(screen.getByText("Start a new review to evaluate a search tool.")).toBeDefined();
  });

  it("renders session list with registered sessions", () => {
    const meta1 = makeMetadata({ toolName: "Tool Alpha" });
    const meta2 = makeMetadata({ toolName: "Tool Beta" });
    seedSessions(meta1, meta2);

    renderSessionManager();

    expect(screen.getByText("Tool Alpha")).toBeDefined();
    expect(screen.getByText("Tool Beta")).toBeDefined();
  });

  it("Start New Review button opens modal", () => {
    renderSessionManager();

    fireEvent.click(screen.getByRole("button", { name: /start new review/i }));

    // NewSessionModal renders a heading with "New Review"
    expect(screen.getByText("New Review")).toBeDefined();
  });

  it("session card shows tool name and status badge", () => {
    const started = makeMetadata({ toolName: "Started Tool", status: "started" });
    const done = makeMetadata({ toolName: "Done Tool", status: "done" });
    seedSessions(started, done);

    renderSessionManager();

    // Tool names
    expect(screen.getByText("Started Tool")).toBeDefined();
    expect(screen.getByText("Done Tool")).toBeDefined();

    // Status badges
    expect(screen.getByText("Started")).toBeDefined();
    expect(screen.getByText("Done")).toBeDefined();
  });

  it("clicking a session card calls switchToSession", () => {
    const meta = makeMetadata({ toolName: "ClickMe" });
    seedSessions(meta);

    renderSessionManager();

    // The session card is a button containing the tool name
    const card = screen.getByRole("button", { name: /clickme/i });
    fireEvent.click(card);

    expect(switchToSession).toHaveBeenCalledWith(meta.id);
  });

  it("clicking delete shows confirmation dialog", () => {
    const meta = makeMetadata({ toolName: "ToDelete" });
    seedSessions(meta);

    renderSessionManager();

    const deleteButtons = screen.getAllByTitle("Delete review");
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText(/Delete review of "ToDelete"/)).toBeDefined();
  });

  it("confirming delete calls deleteSession", async () => {
    const meta = makeMetadata({ toolName: "ToDelete" });
    seedSessions(meta);

    renderSessionManager();

    const deleteButtons = screen.getAllByTitle("Delete review");
    fireEvent.click(deleteButtons[0]);

    // ConfirmDialog's "Delete" button — exact match to avoid "Delete review" icon button
    const confirmBtn = screen.getAllByRole("button").find((btn) => btn.textContent === "Delete");
    expect(confirmBtn).toBeDefined();
    if (confirmBtn) fireEvent.click(confirmBtn);

    expect(deleteSession).toHaveBeenCalledWith(meta.id);
  });

  it("shows favicon fallback with first letter of tool name", () => {
    const meta = makeMetadata({ toolName: "SearchKing", faviconUrl: undefined });
    seedSessions(meta);

    renderSessionManager();

    // Fallback shows uppercase first letter
    expect(screen.getByText("S")).toBeDefined();
  });
});
