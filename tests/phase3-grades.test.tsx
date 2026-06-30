// @vitest-environment jsdom

// Zustand persist captures `window.localStorage` at import time.
// WxtVitest's jsdom provides a broken localStorage — stub it BEFORE store imports.
vi.hoisted(() => {
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
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditModeProvider } from "@/components/edit-mode/EditModeContext";
import GradeSelector from "@/components/finalization/GradeSelector";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { AllProviders, seedActiveSession } from "@/tests/helpers/render-utils";

function renderGradeSelector({
  grade = "",
  onGradeChange = vi.fn(),
  editMode = true,
}: {
  grade?: string;
  onGradeChange?: (grade: string) => void;
  editMode?: boolean;
} = {}) {
  return render(
    <EditModeProvider initialEditMode={editMode}>
      <AllProviders>
        <GradeSelector grade={grade} onGradeChange={onGradeChange} />
      </AllProviders>
    </EditModeProvider>,
  );
}

describe("Phase 3 — GradeSelector add/remove", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useFrameworkCustomizationStore.getState().resetAll();
    useRegistryStore.setState({
      sessionIndex: {},
      activeSessionId: null,
    });
    useSessionStore.getState().clear();
    seedActiveSession();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("remove button removes a grade after confirm", async () => {
    renderGradeSelector({ editMode: true });

    // Each grade card should have a remove button
    const passCard = screen.getByTestId("grade-card-pass");
    const removeBtn = passCard.querySelector('button[aria-label="Remove pass grade"]');
    expect(removeBtn).toBeTruthy();

    // Click remove — opens confirm dialog
    await act(async () => {
      fireEvent.click(removeBtn!);
    });

    // Confirm dialog appears
    const confirmBtn = screen.getByRole("button", { name: "Remove" });
    expect(confirmBtn).toBeTruthy();

    // Click confirm
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    const { customization } = useFrameworkCustomizationStore.getState();
    expect(customization.gradeRemovals).toContain("pass");
  });

  it("add grade via + Add", async () => {
    renderGradeSelector({ editMode: true });

    const addBtn = screen.getByTestId("inline-add-grade");
    expect(addBtn).toBeTruthy();

    // Click to open the input
    await act(async () => {
      fireEvent.click(addBtn);
    });

    const input = screen.getByTestId("inline-add-grade-input");
    expect(input).toBeTruthy();

    // Type a new grade title
    await act(async () => {
      fireEvent.change(input, { target: { value: "Exemplary" } });
    });

    // Submit via Enter
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    const { customization } = useFrameworkCustomizationStore.getState();
    expect(customization.gradeAdditions).toHaveLength(1);
    expect(customization.gradeAdditions[0].id).toBe("exemplary");
    expect(customization.gradeAdditions[0].label).toBe("Exemplary");
    expect(customization.gradeAdditions[0].reportLabel).toBe("EXEMPLARY");
  });

  it("edit-mode OFF: no remove/add affordances", () => {
    renderGradeSelector({ editMode: false });

    // Grades should render as <button role=radio>, not <div role=radio>
    const radioButtons = screen.getAllByRole("radio");
    expect(radioButtons.length).toBeGreaterThan(0);
    for (const btn of radioButtons) {
      expect(btn.tagName).toBe("BUTTON");
    }

    // No remove buttons
    expect(screen.queryByLabelText("Remove pass grade")).toBeNull();

    // No add button
    expect(screen.queryByTestId("inline-add-grade")).toBeNull();
  });
});
