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
import { useState } from "react";
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

describe("Phase 2 — GradeSelector click-to-edit", () => {
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

  it("grade label editable in edit mode", async () => {
    const onChange = vi.fn();
    renderGradeSelector({ onGradeChange: onChange, editMode: true });

    const labelBtn = screen.getByRole("button", { name: "pass grade label" });
    expect(labelBtn).toBeDefined();
    fireEvent.click(labelBtn);

    const input = screen.getByTestId("editable-text-input");
    fireEvent.change(input, { target: { value: "New Label" } });
    fireEvent.blur(input);

    expect(useFrameworkCustomizationStore.getState().customization.gradeOverrides.pass).toEqual({
      label: "New Label",
    });
  });

  it("grade description editable", async () => {
    renderGradeSelector({ editMode: true });

    const descBtn = screen.getByRole("button", { name: "pass grade description" });
    expect(descBtn).toBeDefined();
    fireEvent.click(descBtn);

    const input = screen.getByTestId("editable-text-input");
    fireEvent.change(input, { target: { value: "Updated description text" } });
    fireEvent.blur(input);

    expect(useFrameworkCustomizationStore.getState().customization.gradeOverrides.pass).toEqual({
      description: "Updated description text",
    });
  });

  it("selecting a grade still works in edit mode", () => {
    function StatefulGradeSelector() {
      const [g, setG] = useState("");
      return (
        <AllProviders>
          <GradeSelector grade={g} onGradeChange={setG} />
        </AllProviders>
      );
    }
    render(
      <EditModeProvider initialEditMode>
        <StatefulGradeSelector />
      </EditModeProvider>,
    );

    const card = screen.getByTestId("grade-card-conditional");
    fireEvent.click(card);

    expect(card.getAttribute("aria-checked")).toBe("true");
  });

  it("edit mode OFF: grades render as <button role=radio> (no editable-text-display)", () => {
    renderGradeSelector({ editMode: false });

    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBeGreaterThanOrEqual(3);
    // All should be <button> elements
    for (const radio of radios) {
      expect(radio.tagName).toBe("BUTTON");
    }
    // No editable-text-display elements should be present
    expect(screen.queryAllByTestId("editable-text-display").length).toBe(0);
  });
});
