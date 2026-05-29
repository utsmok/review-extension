// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

// Zustand persist captures window.localStorage at import time.
// WxtVitest's jsdom provides a broken localStorage — stub it BEFORE store imports.
vi.hoisted(() => {
  const store: Record<string, string> = {};
  const shim = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
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
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
  globalThis.localStorage = shim as Storage;
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RubricChipGroup from "@/components/RubricChipGroup";
import type { ScoringQuestion, PassFailQuestion } from "@/lib/types";

afterEach(cleanup);

function makeScoringQuestion(overrides: Partial<ScoringQuestion> = {}): ScoringQuestion {
  return {
    title: "Test Question",
    "0": "No capability",
    "1": "Basic capability",
    "2": "Moderate capability",
    "3": "Strong capability",
    ...overrides,
  };
}

function makePassFailQuestion(overrides: Partial<PassFailQuestion> = {}): PassFailQuestion {
  return {
    type: "pass_fail",
    title: "Test PF Question",
    requirement: "Must pass",
    ...overrides,
  };
}

describe("RubricChipGroup", () => {
  it("renders without errors", () => {
    const questions = {
      q1: makeScoringQuestion(),
      q2: makeScoringQuestion({ title: "Second" }),
    };
    const onToggle = vi.fn();

    const { container } = render(
      <RubricChipGroup
        questions={questions}
        categoryKey="TR"
        linkedIds={[]}
        usesAi={true}
        onToggle={onToggle}
      />,
    );

    expect(container).toBeTruthy();
  });

  it("renders a chip for each question", () => {
    const questions = {
      q1: makeScoringQuestion({ title: "First" }),
      q2: makeScoringQuestion({ title: "Second" }),
    };
    const onToggle = vi.fn();

    render(
      <RubricChipGroup
        questions={questions}
        categoryKey="TR"
        linkedIds={[]}
        usesAi={true}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByLabelText("TR1 First unlinked")).toBeTruthy();
    expect(screen.getByLabelText("TR2 Second unlinked")).toBeTruthy();
  });

  it("calls onToggle when a chip is clicked", () => {
    const questions = {
      q1: makeScoringQuestion({ title: "First" }),
    };
    const onToggle = vi.fn();

    render(
      <RubricChipGroup
        questions={questions}
        categoryKey="TR"
        linkedIds={[]}
        usesAi={true}
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByLabelText("TR1 First unlinked"));
    expect(onToggle).toHaveBeenCalledWith("TR.q1", false);
  });

  it("marks linked chips correctly", () => {
    const questions = {
      q1: makeScoringQuestion({ title: "First" }),
    };
    const onToggle = vi.fn();

    render(
      <RubricChipGroup
        questions={questions}
        categoryKey="TR"
        linkedIds={["TR.q1"]}
        usesAi={true}
        onToggle={onToggle}
      />,
    );

    const btn = screen.getByLabelText("TR1 First linked");
    expect(btn).toBeTruthy();
    expect((btn as HTMLElement).dataset.linked).toBe("true");
  });

  it("shows AI-only marker for ai_only questions when usesAi is false", () => {
    const questions = {
      q1: makeScoringQuestion({ title: "AI Only Q", ai_only: true } as ScoringQuestion & {
        ai_only?: boolean;
      }),
    };
    const onToggle = vi.fn();

    render(
      <RubricChipGroup
        questions={questions}
        categoryKey="TR"
        linkedIds={[]}
        usesAi={false}
        onToggle={onToggle}
      />,
    );

    const btn = screen.getByLabelText("TR1 AI Only Q unlinked");
    expect(btn.textContent).toContain("⁂");
  });

  it("renders with isQG=true using QG question codes", () => {
    const questions = {
      q1: makePassFailQuestion({ title: "PassFail Q" }),
    };
    const onToggle = vi.fn();

    render(
      <RubricChipGroup
        questions={questions}
        categoryKey="test_category"
        linkedIds={[]}
        usesAi={true}
        isQG={true}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByLabelText("TE1 PassFail Q unlinked")).toBeTruthy();
  });
});
