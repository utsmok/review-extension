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
import { getRubricQuestionIds } from "@/lib/rubric";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { makeEvaluation, makeMetadata, RUBRIC } from "@/tests/fixtures";
import { AllProviders, seedActiveSession } from "@/tests/helpers/render-utils";

// ---------------------------------------------------------------------------
// Mock child components to avoid rendering their full subtrees
// ---------------------------------------------------------------------------
vi.mock("@/components/Captures", () => ({
  default: () => <div data-testid="captures" />,
}));
vi.mock("@/components/Evaluation", () => ({
  default: () => <div data-testid="evaluation" />,
}));
vi.mock("@/components/Metadata", () => ({
  default: () => <div data-testid="metadata" />,
}));
vi.mock("@/components/FinalizationScreen", () => ({
  default: () => <div data-testid="finalize" />,
}));

// Mock auto-save to avoid side effects
vi.mock("@/lib/auto-save", () => ({
  initAutoSave: vi.fn(),
}));

// Mock session-lifecycle to avoid IndexedDB access
vi.mock("@/lib/session-lifecycle", () => ({
  saveCurrentSession: vi.fn(),
  loadSessionById: vi.fn(),
  markDoneAndClose: vi.fn(),
  switchToSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
}));

// Mock session-repository to avoid IndexedDB
vi.mock("@/lib/session-repository", () => ({
  getRepository: () => ({ save: vi.fn(), load: vi.fn(), remove: vi.fn() }),
}));

import ActiveSession from "@/components/ActiveSession";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_QUESTION_IDS = getRubricQuestionIds(RUBRIC);

/** Seed a session where every rubric question is scored. */
function seedCompleteSession() {
  const metadata = makeMetadata({ toolName: "CompleteTool", toolUrl: "https://example.com" });
  const evaluations = ALL_QUESTION_IDS.map((id) => makeEvaluation({ rubricId: id, score: "pass" }));
  useSessionStore.getState().loadSession({
    metadata,
    captures: [],
    evaluations,
    finalization: null,
    schemaVersion: 2,
  });
  useRegistryStore.getState().setActiveSessionId(metadata.id);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ActiveSession", () => {
  beforeEach(() => {
    useSessionStore.getState().clear();
    useRegistryStore.setState({
      activeSessionId: null,
      sessionIndex: {},
      settings: { reviewerName: "", reviewerEmail: "", preferredRubric: "trust-full" },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("displays the session tool name in the header", () => {
    seedActiveSession();
    render(<ActiveSession />, { wrapper: AllProviders });
    expect(screen.getByText("TestSearch")).toBeDefined();
  });

  it("renders Captures panel by default", () => {
    seedActiveSession();
    render(<ActiveSession />, { wrapper: AllProviders });
    expect(screen.getByTestId("captures")).toBeDefined();
  });

  it("switches to Evaluation tab on click", () => {
    seedActiveSession();
    render(<ActiveSession />, { wrapper: AllProviders });

    const evalTab = screen.getByRole("tab", { name: /evaluation/i });
    fireEvent.click(evalTab);

    expect(screen.getByTestId("evaluation")).toBeDefined();
    expect(screen.queryByTestId("captures")).toBeNull();
  });

  it("switches to Metadata tab on click", () => {
    seedActiveSession();
    render(<ActiveSession />, { wrapper: AllProviders });

    const metaTab = screen.getByRole("tab", { name: /metadata/i });
    fireEvent.click(metaTab);

    expect(screen.getByTestId("metadata")).toBeDefined();
    expect(screen.queryByTestId("captures")).toBeNull();
  });

  it("shows checkmark SVG on Evaluation tab when all questions are scored", () => {
    seedCompleteSession();
    render(<ActiveSession />, { wrapper: AllProviders });

    const evalTab = screen.getByRole("tab", { name: /evaluation/i });
    // TabCheck renders an SVG with aria-hidden inside the tab button
    const svg = evalTab.querySelector("svg");
    expect(svg).toBeDefined();
    expect(svg?.getAttribute("class")).toContain("text-ut-green");
  });

  it("does not show checkmark SVG on Evaluation tab when incomplete", () => {
    seedActiveSession(); // no evaluations
    render(<ActiveSession />, { wrapper: AllProviders });

    const evalTab = screen.getByRole("tab", { name: /evaluation/i });
    const svgs = evalTab.querySelectorAll("svg");
    expect(svgs).toHaveLength(0);
  });

  it("calls closeSession when close button is clicked", () => {
    seedActiveSession();
    render(<ActiveSession />, { wrapper: AllProviders });

    const closeBtn = screen.getByRole("button", { name: /close review/i });
    fireEvent.click(closeBtn);

    expect(useSessionStore.getState().session).toBeNull();
    expect(useRegistryStore.getState().activeSessionId).toBeNull();
  });

  it("unmounts inactive tab content when switching tabs", () => {
    seedActiveSession();
    render(<ActiveSession />, { wrapper: AllProviders });

    // Click to Metadata tab
    const metaTab = screen.getByRole("tab", { name: /metadata/i });
    fireEvent.click(metaTab);
    expect(screen.getByTestId("metadata")).toBeDefined();

    // Switch to Evaluation — Metadata should be unmounted
    const evalTab = screen.getByRole("tab", { name: /evaluation/i });
    fireEvent.click(evalTab);
    expect(screen.getByTestId("evaluation")).toBeDefined();
    expect(screen.queryByTestId("metadata")).toBeNull();
  });
});
