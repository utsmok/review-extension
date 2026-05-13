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
import { RubricContext, TabNavigationContext } from "@/lib/contexts";
import type { Evaluation } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { makeEvaluation, makeMetadata, RUBRIC } from "@/tests/fixtures";
import { seedActiveSession } from "@/tests/helpers/render-utils";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/components/ExportCompleteScreen", () => ({
  default: (_props: Record<string, unknown>) => (
    <div data-testid="export-complete">Export complete</div>
  ),
}));

vi.mock("@/components/ConfirmDialog", () => ({
  default: (props: { message: string; actions: Array<{ label: string; handler: () => void }> }) => (
    <div data-testid="confirm-dialog">
      <span>{props.message}</span>
      {props.actions.map((a) => (
        <button key={a.label} type="button" onClick={a.handler}>
          {a.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/lib/export", () => ({
  exportSession: vi.fn().mockResolvedValue(new Blob(["fake"])),
  downloadBlob: vi.fn(),
  sanitizeFilename: (s: string) => s,
}));

vi.mock("@/lib/auto-save", () => ({
  initAutoSave: vi.fn(),
}));

vi.mock("@/lib/session-lifecycle", () => ({
  saveCurrentSession: vi.fn(),
  loadSessionById: vi.fn(),
  markDoneAndClose: vi.fn(),
  switchToSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock("@/lib/session-repository", () => ({
  getRepository: () => ({ save: vi.fn(), load: vi.fn(), remove: vi.fn() }),
}));

import Metadata from "@/components/Metadata";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render Metadata wrapped in all required providers. */
function renderMetadata() {
  return render(
    <RubricContext.Provider value={{ rubric: RUBRIC, usesAi: false }}>
      <TabNavigationContext.Provider value={vi.fn()}>
        <Metadata />
      </TabNavigationContext.Provider>
    </RubricContext.Provider>,
  );
}

/** Find a label by its text, then get the associated input */
function getInputByLabel(labelText: string | RegExp): HTMLElement {
  const label = screen.getByText(labelText);
  const labelEl = label.closest("label");
  if (!labelEl) throw new Error(`No label element found for "${labelText}"`);
  const input = labelEl.querySelector("input,textarea");
  if (!input) throw new Error(`No input found in label "${labelText}"`);
  return input as HTMLElement;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Metadata", () => {
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

  it("renders all form fields", () => {
    seedActiveSession();
    renderMetadata();

    expect(screen.getByText(/tool description/i)).toBeDefined();
    expect(screen.getByText(/^company$/i)).toBeDefined();
    expect(screen.getByText(/pricing/i)).toBeDefined();
    expect(screen.getByText(/data sources/i)).toBeDefined();
    expect(screen.getByText(/search methods/i)).toBeDefined();
    expect(screen.getByText(/discipline/i)).toBeDefined();
    expect(screen.getByText(/review notes/i)).toBeDefined();
    expect(screen.getByText(/access level/i)).toBeDefined();
    expect(screen.getByText(/terms & conditions url/i)).toBeDefined();
    expect(screen.getByText(/tool logo url/i)).toBeDefined();
    expect(screen.getByText(/tool uses ai \/ llm/i)).toBeDefined();
  });

  it("calls updateMetadata when typing in description field", () => {
    seedActiveSession();
    renderMetadata();

    const descriptionInput = getInputByLabel(/tool description/i);
    fireEvent.change(descriptionInput, { target: { value: "A great tool" } });

    const session = useSessionStore.getState().session;
    expect(session?.description).toBe("A great tool");
  });

  it("calls updateMetadata when typing in company field", () => {
    seedActiveSession();
    renderMetadata();

    const companyInput = getInputByLabel(/^company$/i);
    fireEvent.change(companyInput, { target: { value: "TestCorp" } });

    const session = useSessionStore.getState().session;
    expect(session?.company).toBe("TestCorp");
  });

  it("toggles data source chip on click", () => {
    seedActiveSession();
    renderMetadata();

    // Chip buttons are inside a <label>, so accessible names include label text.
    // Use getByText to find the chip directly.
    const crossRefEl = screen.getByText("CrossRef").closest("button");
    expect(crossRefEl).toBeDefined();
    fireEvent.click(crossRefEl as HTMLElement);

    const session = useSessionStore.getState().session;
    expect(session?.dataSources).toContain("CrossRef");

    fireEvent.click(crossRefEl as HTMLElement);
    const session2 = useSessionStore.getState().session;
    expect(session2?.dataSources).not.toContain("CrossRef");
  });

  it("shows selected data source chip with active styling", () => {
    const metadata = makeMetadata({ dataSources: ["PubMed", "Semantic Scholar"] });
    useSessionStore.getState().loadSession({
      metadata,
      captures: [],
      evaluations: [],
      finalization: null,
      schemaVersion: 2,
    });
    useRegistryStore.getState().setActiveSessionId(metadata.id);
    renderMetadata();

    const pubmedBtn = screen.getByText("PubMed").closest("button") as HTMLElement;
    expect(pubmedBtn.className).toContain("bg-trust-magenta");

    const scholarBtn = screen.getByText("Semantic Scholar").closest("button") as HTMLElement;
    expect(scholarBtn.className).toContain("bg-trust-magenta");
  });

  it("triggers exactly 1 store update per keystroke in a text field", () => {
    seedActiveSession();

    // Intercept updateMetadata BEFORE rendering so the component binds to the spy
    const storeUpdates: string[] = [];
    const origUpdate = useSessionStore.getState().updateMetadata;
    useSessionStore.setState({
      updateMetadata: (patch) => {
        storeUpdates.push(Object.keys(patch)[0] ?? "");
        origUpdate(patch);
      },
    });

    renderMetadata();

    const descriptionInput = getInputByLabel(/tool description/i);
    fireEvent.change(descriptionInput, { target: { value: "X" } });

    expect(storeUpdates).toHaveLength(1);
    expect(storeUpdates[0]).toBe("description");
  });

  it("export button triggers exportAndClose flow", async () => {
    seedActiveSession();
    renderMetadata();

    const exportBtn = screen.getByRole("button", { name: /end review & export/i });
    expect(exportBtn).toBeDefined();
    fireEvent.click(exportBtn);

    // After clicking, the button should show "Exporting..."
    await vi.waitFor(() => {
      expect(screen.getByText("Exporting...")).toBeDefined();
    });
  });

  it("shows review summary with completion stats", () => {
    const metadata = makeMetadata();
    const evals: Evaluation[] = [
      makeEvaluation({ rubricId: "TR.data_source_clarity", score: 3 }),
      makeEvaluation({ rubricId: "TR.methodology_disclosure", score: 2 }),
      makeEvaluation({ rubricId: "RE.accuracy_and_hallucination", score: 1 }),
    ];
    useSessionStore.getState().loadSession({
      metadata,
      captures: [],
      evaluations: evals,
      finalization: null,
      schemaVersion: 2,
    });
    useRegistryStore.getState().setActiveSessionId(metadata.id);

    renderMetadata();

    // "Scored items" row shows count 3
    const scoredLabel = screen.getByText("Scored items");
    const row = scoredLabel.closest(".flex");
    expect(row).toBeDefined();
    expect(row?.textContent).toContain("3");

    // "Captures" row shows count 0
    const capturesLabel = screen.getByText("Captures");
    const capturesRow = capturesLabel.closest(".flex");
    expect(capturesRow).toBeDefined();
    expect(capturesRow?.textContent).toContain("0");

    // No captures warning
    expect(screen.getByText(/no captures/i)).toBeDefined();
  });

  it("shows review not finalized warning when no finalization", () => {
    seedActiveSession();
    renderMetadata();

    expect(screen.getByText(/review not finalized/i)).toBeDefined();
    expect(screen.getByText(/finalize review/i)).toBeDefined();
  });

  it("shows finalized timestamp when finalization is present", () => {
    const metadata = makeMetadata();
    const finalization = {
      conclusion: "Done",
      grade: "pass" as const,
      strengths: [],
      weaknesses: [],
      recommendations: "",
      finalizedAt: "2025-06-15T12:00:00.000Z",
    };
    useSessionStore.getState().loadSession({
      metadata,
      captures: [],
      evaluations: [],
      finalization,
      schemaVersion: 2,
    });
    useRegistryStore.getState().setActiveSessionId(metadata.id);

    renderMetadata();

    expect(screen.getByText(/finalized/i)).toBeDefined();
    expect(screen.queryByText(/review not finalized/i)).toBeNull();
  });

  it("toggles AI checkbox", () => {
    seedActiveSession();
    renderMetadata();

    const checkbox = screen.getByRole("checkbox", { name: /tool uses ai/i });
    // makeMetadata defaults usesAi to undefined, but the component defaults to true
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    fireEvent.click(checkbox);

    const session = useSessionStore.getState().session;
    expect(session?.usesAi).toBe(false);
  });

  it("shows discard confirmation on discard button click", () => {
    seedActiveSession();
    renderMetadata();

    const discardBtn = screen.getByRole("button", { name: /discard review/i });
    fireEvent.click(discardBtn);

    expect(screen.getByTestId("confirm-dialog")).toBeDefined();
    expect(screen.getByText(/permanently delete/i)).toBeDefined();
  });
});
