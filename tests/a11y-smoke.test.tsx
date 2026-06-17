// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AllProviders, seedActiveSession } from "@/tests/helpers/render-utils";

vi.mock("@/lib/session-repository", () => ({ getRepository: vi.fn() }));
vi.mock("@/lib/capture", () => ({ captureActiveTab: vi.fn(), captureForMetadataField: vi.fn() }));
vi.mock("@/lib/session-lifecycle", () => ({
  saveCurrentSession: vi.fn(),
  exportSessionById: vi.fn(),
  importSessionFromZipFile: vi.fn(),
  switchToSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  markDoneAndClose: vi.fn(),
  loadSessionById: vi.fn(),
  initAutoSave: vi.fn(),
  teardownAutoSave: vi.fn(),
}));
vi.mock("@/lib/export", () => ({
  downloadBlob: vi.fn(),
  exportSession: vi.fn(() => new Blob()),
  sanitizeFilename: vi.fn((s: string) => s),
}));
vi.mock("@/lib/screenshot-store", () => ({
  saveScreenshot: vi.fn(),
  saveAnnotatedScreenshot: vi.fn(),
  deleteScreenshot: vi.fn(),
}));
vi.mock("@/hooks/useKeyboardShortcuts", () => ({ useKeyboardShortcuts: vi.fn() }));

import { ActiveSession } from "@/components/ActiveSession";
import AppShell from "@/components/AppShell";
import FinalizationScreen from "@/components/FinalizationScreen";
import GradeSelector from "@/components/finalization/GradeSelector";
import { QuestionSection } from "@/components/QuestionSection";
import SessionManager from "@/components/SessionManager";

const qsProps = {
  section: "scoring_rubric" as const,
  capturingFor: null,
  setCapturingFor: vi.fn(),
  captureQueue: { enqueue: vi.fn(), isCapturing: false } as never,
  onConfirmRemove: vi.fn(),
  onViewEvidence: vi.fn(),
};

describe("Accessibility smoke tests", () => {
  afterEach(() => cleanup());

  describe("ActiveSession tabs", () => {
    it("has tablist with tab role and aria-selected", () => {
      seedActiveSession();
      render(<ActiveSession />, { wrapper: AllProviders });
      const tablist = screen.getByRole("tablist", { name: "Review sections" });
      const tabs = within(tablist).getAllByRole("tab");
      expect(tabs).toHaveLength(4);
      const selected = tabs.find((t) => t.getAttribute("aria-selected") === "true");
      expect(selected?.textContent).toContain("Evaluation");
      expect(selected?.tabIndex).toBe(0);
      const inactive = tabs.find((t) => t.getAttribute("aria-selected") !== "true");
      expect(inactive?.tabIndex).toBe(-1);
    });

    it("tabpanel has proper aria-labelledby and aria-live", () => {
      seedActiveSession();
      render(<ActiveSession />, { wrapper: AllProviders });
      const panel = screen.getByRole("tabpanel");
      expect(panel.getAttribute("aria-labelledby")).toBe("tab-evaluation");
      expect(panel.getAttribute("aria-live")).toBe("polite");
    });
  });

  describe("AppShell landmarks", () => {
    it("has skip link, main landmark, and optional settings button", () => {
      render(
        <AppShell>
          <p>Content</p>
        </AppShell>,
      );
      expect(screen.getByText("Skip to content").closest("a")?.getAttribute("href")).toBe(
        "#main-content",
      );
      expect(screen.getByRole("main").id).toBe("main-content");
      expect(screen.queryByLabelText("Settings")).toBeNull();
    });

    it("shows setup banner when no reviewer name", () => {
      render(
        <AppShell showSettingsButton>
          <p>Content</p>
        </AppShell>,
      );
      expect(screen.getByTestId("setup-banner")).toBeDefined();
    });
  });

  describe("SessionManager", () => {
    it("has aria-label region and role=note for shortcuts", () => {
      render(<SessionManager />);
      expect(screen.getByRole("region", { name: "Review sessions" })).toBeDefined();
      expect(screen.getByText("Start New Review")).toBeDefined();
      expect(screen.getByRole("note", { name: "Keyboard shortcuts" })).toBeDefined();
    });
  });

  describe("GradeSelector", () => {
    it("grade buttons are native buttons with visible labels", () => {
      render(<GradeSelector grade="" onGradeChange={vi.fn()} />);
      for (const label of ["Pass", "Conditional", "Fail"]) {
        const btn = screen.getByText(label).closest("button");
        expect(btn?.tagName).toBe("BUTTON");
        expect(btn?.getAttribute("type")).toBe("button");
      }
    });
    it("moves selection and focus with arrow/Home/End keys", () => {
      const onChange = vi.fn();
      render(<GradeSelector grade="" onGradeChange={onChange} />);
      const group = screen.getByRole("radiogroup");
      const radios = screen.getAllByRole("radio");

      // First radio is the roving tab stop when nothing is selected.
      expect(radios[0].tabIndex).toBe(0);

      // ArrowRight advances selection to the next grade and moves focus to it.
      fireEvent.keyDown(group, { key: "ArrowRight" });
      expect(onChange).toHaveBeenLastCalledWith("conditional");
      expect(document.activeElement).toBe(radios[1]);

      // Home selects the first grade, End the last.
      fireEvent.keyDown(group, { key: "Home" });
      expect(onChange).toHaveBeenLastCalledWith("pass");
      fireEvent.keyDown(group, { key: "End" });
      expect(onChange).toHaveBeenLastCalledWith("fail");
    });
  });

  describe("FinalizationScreen", () => {
    it("has heading and labelled form fields", () => {
      seedActiveSession();
      render(<FinalizationScreen />, { wrapper: AllProviders });
      expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("Finalize Review");
      const conclusionTextarea = screen
        .getByText("Conclusion")
        .closest("label")
        ?.querySelector("textarea");
      expect(conclusionTextarea).toBeDefined();
      expect(screen.getByText("Recommendations")).toBeDefined();
    });

    it("overall score region has role=status with aria-label", () => {
      seedActiveSession();
      render(<FinalizationScreen />, { wrapper: AllProviders });
      expect(screen.getByRole("status").getAttribute("aria-label")).toMatch(/score|no scores/i);
    });
  });

  describe("QuestionSection", () => {
    it("uses details/summary for scoring questions", () => {
      seedActiveSession();
      render(<QuestionSection {...qsProps} />, { wrapper: AllProviders });
      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Scoring Rubric");
      const details = document.querySelectorAll("details.question-details");
      expect(details.length).toBeGreaterThan(0);
      for (const d of Array.from(details)) expect(d.querySelector("summary")).not.toBeNull();
    });

    it("scoring radiogroups have aria-label after opening details", () => {
      seedActiveSession();
      render(<QuestionSection {...qsProps} />, { wrapper: AllProviders });
      const firstDetails = document.querySelector("details.question-details")!;
      firstDetails.setAttribute("open", "");
      firstDetails
        .querySelector("summary")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      const radioGroups = document.querySelectorAll('[role="radiogroup"]');
      expect(radioGroups.length).toBeGreaterThan(0);
      for (const rg of Array.from(radioGroups)) {
        expect(rg.getAttribute("aria-label")).toContain("Rubric score for");
      }
    });
  });
});
