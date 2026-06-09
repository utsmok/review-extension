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

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type makeEvaluation, RUBRIC } from "@/tests/fixtures";
import { AllProviders } from "@/tests/helpers/render-utils";

const mockRemoveCapture = vi.fn();
const mockUnlinkCapture = vi.fn();
const mockEnqueue = vi.fn();

vi.mock("@/hooks/useActiveSession", () => ({
  useActiveSession: () => ({
    evaluations: [] as Array<ReturnType<typeof makeEvaluation>>,
    captures: [],
    removeCapture: mockRemoveCapture,
    unlinkCaptureFromRubric: mockUnlinkCapture,
    setEvaluation: vi.fn(),
    addCapture: vi.fn(),
    linkCaptureToRubric: vi.fn(),
  }),
}));

vi.mock("@/hooks/useCaptureQueue", () => ({
  useCaptureQueue: () => ({ enqueue: mockEnqueue, isCapturing: false }),
}));

vi.mock("@/components/contexts", () => ({
  useRubric: () => ({ rubric: RUBRIC, usesAi: true }),
  RubricContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

vi.mock("@/lib/capture", () => ({
  captureActiveTab: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/stores/toast", () => ({
  toastError: vi.fn(),
}));

vi.mock("@/components/ScoreOverviewBar", () => ({
  __esModule: true,
  default: () => <div data-testid="score-overview-bar">ScoreOverviewBar</div>,
}));

vi.mock("@/components/EvidenceModal", () => ({
  __esModule: true,
  default: () => <div>EvidenceModal</div>,
}));

vi.mock("@/components/ConfirmDialog", () => ({
  __esModule: true,
  default: () => <div>ConfirmDialog</div>,
}));

import Evaluation from "@/components/Evaluation";

afterEach(() => {
  cleanup();
});

function renderEvaluation() {
  return render(<Evaluation />, { wrapper: AllProviders });
}

describe("Evaluation", () => {
  it("renders Quality Gates and Scoring Rubric headings", () => {
    renderEvaluation();
    expect(screen.getByText("Quality Gates")).toBeTruthy();
    expect(screen.getByText("Scoring Rubric")).toBeTruthy();
  });

  it("renders ScoreOverviewBar", () => {
    renderEvaluation();
    expect(screen.getByTestId("score-overview-bar")).toBeTruthy();
  });

  it("shows empty state when no evaluations", () => {
    renderEvaluation();
    expect(screen.getByText("Begin your evaluation")).toBeTruthy();
  });

  it("renders question sections with category kickers", () => {
    renderEvaluation();
    // rubric categories have kickers rendered by QuestionSection
    const sections = screen.getAllByRole("heading", { level: 2 });
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });
});
