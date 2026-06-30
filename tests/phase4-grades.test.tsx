// @vitest-environment jsdom

// Zustand persist captures `window.localStorage` at import time.
// WxtVitest's jsdom provides a broken localStorage — stub it BEFORE store imports.
vi.hoisted(() => {
  const store: Record<string, string> = {};
  const shim = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
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

describe("Phase 4 — GradeSelector color/tint popup", () => {
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

  it("color popup opens and a swatch writes color override", async () => {
    renderGradeSelector({ editMode: true });

    // Open the gear popup for the "pass" grade
    const gearBtn = screen.getByLabelText("Style pass grade");
    expect(gearBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(gearBtn);
    });

    // Panel should be open
    const panel = screen.getByTestId("popup-editor-panel");
    expect(panel).toBeTruthy();

    // Find the color swatch for bg-ut-green inside the panel
    const greenSwatch = panel.querySelector('[aria-label="Color bg-ut-green"]') as HTMLElement;
    expect(greenSwatch).toBeTruthy();

    await act(async () => {
      fireEvent.click(greenSwatch);
    });

    // Verify override was written
    const { customization } = useFrameworkCustomizationStore.getState();
    expect(customization.gradeOverrides.pass?.color).toBe("bg-ut-green");
  });

  it("tint swatch writes tint override", async () => {
    renderGradeSelector({ editMode: true });

    // Open the gear popup for the "pass" grade
    const gearBtn = screen.getByLabelText("Style pass grade");
    await act(async () => {
      fireEvent.click(gearBtn);
    });

    const panel = screen.getByTestId("popup-editor-panel");

    // Find the tint swatch for bg-grade-conditional-tint
    const conditionalTint = panel.querySelector(
      '[aria-label="Tint bg-grade-conditional-tint"]',
    ) as HTMLElement;
    expect(conditionalTint).toBeTruthy();

    await act(async () => {
      fireEvent.click(conditionalTint);
    });

    const { customization } = useFrameworkCustomizationStore.getState();
    expect(customization.gradeOverrides.pass?.tint).toBe("bg-grade-conditional-tint");
  });

  it("edit-mode OFF: no gear popup", () => {
    renderGradeSelector({ editMode: false });

    // No gear button should be present
    expect(screen.queryByLabelText("Style pass grade")).toBeNull();
    expect(screen.queryByLabelText("Style conditional grade")).toBeNull();
    expect(screen.queryByLabelText("Style fail grade")).toBeNull();
  });
});
