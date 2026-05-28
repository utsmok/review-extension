import { useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { captureForMetadataField } from "@/lib/capture";
import { useRubric, useTabNavigation } from "@/lib/contexts";
import { toastError } from "@/stores/toast";
import ConfirmDialog from "./ConfirmDialog";
import ExportCompleteScreen from "./ExportCompleteScreen";

const DATA_SOURCE_OPTIONS = [
  "CrossRef",
  "OpenAlex",
  "OpenCitations",
  "DataCite",
  "Scopus",
  "Web of Science",
  "PubMed",
  "Semantic Scholar",
  "Google Scholar",
  "IEEE Xplore",
  "JSTOR",
] as const;

const SEARCH_METHOD_OPTIONS = [
  "Keywords",
  "Semantic search",
  "Boolean queries",
  "Natural language",
  "Citation chaining",
  "Faceted filtering",
] as const;

const DISCIPLINE_OPTIONS = [
  "Agricultural and Biological Sciences",
  "History and Archaeology",
  "Languages and Literature",
  "Philosophy and Ethics",
  "Performing Arts",
  "Visual Arts and Design",
  "Religious Studies",
  "Biochemistry Genetics and Molecular Biology",
  "Business Management and Accounting",
  "Chemical Engineering",
  "Chemistry",
  "Computer Science",
  "Decision Sciences",
  "Dentistry",
  "Earth and Planetary Sciences",
  "Economics Econometrics and Finance",
  "Energy",
  "Engineering",
  "Environmental Science",
  "Health Professions",
  "Immunology and Microbiology",
  "Materials Science",
  "Mathematics",
  "Medicine",
  "Neuroscience",
  "Nursing",
  "Pharmacology Toxicology and Pharmaceutics",
  "Physics and Astronomy",
  "Psychology",
  "Education and Educational Research",
  "Law, Policy, and Criminology",
  "Political Science and International Relations",
  "Sociology, Anthropology, and Social Work",
  "Veterinary",
] as const;
const AUTH_METHOD_OPTIONS = [
  "SSO/SAML",
  "IP Authentication",
  "OpenAthens",
  "Proxy (EZproxy)",
  "LibKey",
  "Email-only",
  "API Key",
  "None required",
] as const;

/** Derive custom entries: those in the value array that aren't predefined */
function getCustom<T extends string>(predefined: readonly T[], values: string[]): string[] {
  const set = new Set<string>(predefined);
  return values.filter((v) => !set.has(v));
}

export default function Metadata() {
  const { rubric } = useRubric();
  const setActiveTab = useTabNavigation();
  const {
    session,
    updateMetadata,
    captures,
    addCapture,
    updateCapture,
    removeCapture,
    evaluations,
    setEvaluation,
    finalization,
    exportAndClose,
    deleteSession,
    closeSession,
  } = useActiveSession();
  const [exporting, setExporting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportFilename, setExportFilename] = useState("");
  const [showUsesAiConfirm, setShowUsesAiConfirm] = useState(false);
  const [customSource, setCustomSource] = useState("");
  const [customMethod, setCustomMethod] = useState("");
  const [customDiscipline, setCustomDiscipline] = useState("");
  const [logoCapturing, setLogoCapturing] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [tcCapturing, setTcCapturing] = useState(false);

  /** Collect all rubric IDs where ai_only is true */
  const getAiOnlyRubricIds = (): string[] => {
    const ids: string[] = [];
    if (!rubric) return ids;
    for (const [cat, section] of Object.entries(rubric.quality_gate)) {
      for (const [id, question] of Object.entries(section)) {
        if (question.ai_only) ids.push(`${cat}.${id}`);
      }
    }
    for (const [cat, section] of Object.entries(rubric.scoring_rubric)) {
      for (const [id, question] of Object.entries(section)) {
        if (question.ai_only) ids.push(`${cat}.${id}`);
      }
    }
    return ids;
  };

  /** Check whether any AI-only questions currently have a non-trivial score */
  const hasScoredAiOnlyQuestions = (): boolean => {
    const aiIds = new Set(getAiOnlyRubricIds());
    if (aiIds.size === 0) return false;
    return evaluations.some(
      (e) => aiIds.has(e.rubricId) && e.score !== "" && e.score !== "na" && e.score !== "unsure",
    );
  };

  /** Set all AI-only question scores to "na" */
  const clearAiOnlyScores = () => {
    for (const id of getAiOnlyRubricIds()) {
      const ev = evaluations.find((e) => e.rubricId === id);
      if (ev && ev.score !== "" && ev.score !== "na" && ev.score !== "unsure") {
        setEvaluation(id, { score: "na" });
      }
    }
  };
  const handleCaptureLogo = async () => {
    setLogoCapturing(true);
    try {
      const { capture, logoUrl } = await captureForMetadataField("toolLogoUrl");
      addCapture(capture);
      updateMetadata({ toolLogoUrl: logoUrl ?? "" });
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Capture failed");
    } finally {
      setLogoCapturing(false);
    }
  };
  const handleCaptureTc = async () => {
    setTcCapturing(true);
    try {
      const { capture } = await captureForMetadataField("termsConditionsUrl");
      addCapture(capture);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Capture failed");
    } finally {
      setTcCapturing(false);
    }
  };

  if (!session) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAndClose(rubric);
      setExportFilename(`TRUST_Review_${session.toolName}.zip`);
      setExportComplete(true);
    } finally {
      setExporting(false);
    }
  };

  const canExport = (): { ok: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    if (!session.toolName?.trim()) warnings.push("Tool name is missing");
    if (!session.toolUrl?.trim()) warnings.push("Tool URL is missing");
    return { ok: warnings.length === 0, warnings };
  };

  const handleDiscardSession = () => {
    setShowDiscardConfirm(true);
  };

  const scoredCount = evaluations.filter((e) => e.score !== "" && e.score !== undefined).length;

  const handleDone = () => {
    closeSession();
  };

  // Export completion overlay
  if (exportComplete) {
    return (
      <ExportCompleteScreen
        captures={captures.length}
        scoredCount={scoredCount}
        finalization={finalization}
        filename={exportFilename}
        onDone={handleDone}
      />
    );
  }

  // --- Pill field helpers ---

  const currentSources = session.dataSources ?? [];
  const customSources = getCustom(DATA_SOURCE_OPTIONS, currentSources);

  const togglePredefinedSource = (opt: string) => {
    const next = currentSources.includes(opt)
      ? currentSources.filter((v) => v !== opt)
      : [...currentSources, opt];
    updateMetadata({ dataSources: next });
  };

  const removeCustomSource = (val: string) => {
    updateMetadata({ dataSources: currentSources.filter((v) => v !== val) });
  };

  const addCustomSource = () => {
    const val = customSource.trim();
    if (val && !currentSources.includes(val)) {
      updateMetadata({ dataSources: [...currentSources, val] });
      setCustomSource("");
    }
  };

  const currentMethods = session.searchMethods ?? [];
  const customMethods = getCustom(SEARCH_METHOD_OPTIONS, currentMethods);

  const togglePredefinedMethod = (opt: string) => {
    const next = currentMethods.includes(opt)
      ? currentMethods.filter((v) => v !== opt)
      : [...currentMethods, opt];
    updateMetadata({ searchMethods: next });
  };

  const removeCustomMethod = (val: string) => {
    updateMetadata({ searchMethods: currentMethods.filter((v) => v !== val) });
  };

  const addCustomMethod = () => {
    const val = customMethod.trim();
    if (val && !currentMethods.includes(val)) {
      updateMetadata({ searchMethods: [...currentMethods, val] });
      setCustomMethod("");
    }
  };

  const currentDisciplines: string[] = Array.isArray(session.discipline) ? session.discipline : [];
  const customDisciplines = getCustom(DISCIPLINE_OPTIONS, currentDisciplines);

  const togglePredefinedDiscipline = (opt: string) => {
    const next = currentDisciplines.includes(opt)
      ? currentDisciplines.filter((v) => v !== opt)
      : [...currentDisciplines, opt];
    updateMetadata({ discipline: next });
  };

  const removeCustomDiscipline = (val: string) => {
    updateMetadata({ discipline: currentDisciplines.filter((v) => v !== val) });
  };

  const addCustomDiscipline = () => {
    const val = customDiscipline.trim();
    if (val && !currentDisciplines.includes(val)) {
      updateMetadata({ discipline: [...currentDisciplines, val] });
      setCustomDiscipline("");
    }
  };

  // --- Reusable pill renderer ---
  const renderPill = (
    label: string,
    isSelected: boolean,
    onClick: () => void,
    _isCustom: boolean,
  ) => (
    <button
      key={label}
      type="button"
      className={`pill-toggle text-ut-xs px-ut-2 py-ut-1 border rounded-ut-sm ${isSelected ? "bg-trust-magenta text-white border-trust-magenta" : "border-ut-border text-ut-muted hover:border-ut-slate"}`}
      onClick={onClick}
    >
      {label}
    </button>
  );

  const renderCustomInput = (
    placeholder: string,
    value: string,
    onChange: (v: string) => void,
    onAdd: () => void,
  ) => (
    <div className="flex gap-ut-1">
      <input
        className="flex-1 border border-ut-border rounded-ut-sm bg-ut-grey px-ut-2 py-ut-1 text-ut-xs text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-ut-3 p-ut-4">
      <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta">
        Tool Details
      </h2>

      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Review Notes
        </span>
        <textarea
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text resize-y focus:outline-none focus:ring-2 focus:ring-ut-blue"
          rows={3}
          placeholder="General observations, context..."
          value={session.notes ?? ""}
          onChange={(e) => updateMetadata({ notes: e.target.value })}
        />
      </label>

      <label className="flex items-center gap-ut-2">
        <input
          type="checkbox"
          checked={session.usesAi ?? true}
          onChange={(e) => {
            const next = e.target.checked;
            if (!next && hasScoredAiOnlyQuestions()) {
              setShowUsesAiConfirm(true);
            } else {
              updateMetadata({ usesAi: next });
            }
          }}
          className="w-4 h-4 rounded-ut-sm border-ut-border text-ut-blue focus:ring-ut-blue"
        />
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Tool uses AI / LLM
        </span>
      </label>
      {!(session.usesAi ?? true) && (
        <p className="text-ut-xs text-ut-muted">
          AI-specific questions are marked as not applicable.
        </p>
      )}
      <hr className="border-ut-border my-ut-2" />

      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Tool Description
        </span>
        <input
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
          placeholder="e.g. Citation-based searching through a visual interface"
          value={session.description ?? ""}
          onChange={(e) => updateMetadata({ description: e.target.value })}
        />
      </label>
      <hr className="border-ut-border my-ut-2" />

      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Company
        </span>
        <input
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
          placeholder="e.g. Elsevier"
          value={session.company ?? ""}
          onChange={(e) => updateMetadata({ company: e.target.value })}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Tool Logo URL
        </span>
        <div className="flex items-center gap-ut-2">
          <input
            className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue flex-1"
            placeholder="Paste logo image URL..."
            value={session.toolLogoUrl ?? ""}
            onChange={(e) => updateMetadata({ toolLogoUrl: e.target.value })}
          />
          {session?.toolLogoUrl && (
            <img
              src={session.toolLogoUrl}
              alt="Logo"
              className="meta-logo-img"

            />
          )}
        </div>
        {(() => {
          const linkedCapture = captures.find((c) => c.metadataField === "toolLogoUrl");
          return (
            <div className="meta-capture-panel">
              {linkedCapture ? (
                <div className="meta-capture-item">
                  <a href={linkedCapture.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {linkedCapture.sourceUrl}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeCapture(linkedCapture.id)}
                    className="btn-icon-remove"

                    aria-label="Remove logo capture"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <p className="text-ut-xs text-ut-muted">No logo captured yet.</p>
              )}
              <div className="meta-capture-actions">
                <button type="button" disabled={logoCapturing} onClick={handleCaptureLogo}>
                  Capture Page
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Pricing
        </span>
        <input
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
          placeholder="e.g. Freemium, Subscription"
          value={session.pricing ?? ""}
          onChange={(e) => updateMetadata({ pricing: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Access Level
        </span>
        <input
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
          placeholder="e.g. Institutional license required"
          value={session.availability ?? ""}
          onChange={(e) => updateMetadata({ availability: e.target.value })}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Terms &amp; Conditions
        </span>
        <input
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
          placeholder="Paste T&C URL..."
          value={session.termsConditionsUrl ?? ""}
          onChange={(e) => updateMetadata({ termsConditionsUrl: e.target.value })}
        />
        {(() => {
          const tcCaptures = captures.filter((c) => c.metadataField === "termsConditionsUrl");
          return (
            <div className="meta-capture-panel">
              {tcCaptures.length > 0 && (
                <div className="meta-capture-linked">
                  {tcCaptures.map((c) => (
                    <div key={c.id} className="meta-capture-item">
                      <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {c.pageTitle || c.sourceUrl}
                      </a>
                      <input
                        className="capture-notes-input"
                        placeholder="Describe this evidence..."
                        value={c.notes}
                        onChange={(e) => updateCapture(c.id, { notes: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => removeCapture(c.id)}
                        className="btn-icon-remove"
                        aria-label="Remove evidence"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="meta-capture-actions">
                <button type="button" disabled={tcCapturing} onClick={handleCaptureTc}>
                  Capture Page
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Data Sources pill selector */}
      <fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
        <legend className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Data Sources
        </legend>
        <div className="flex flex-wrap gap-ut-1 mb-ut-1">
          {DATA_SOURCE_OPTIONS.map((opt) =>
            renderPill(opt, currentSources.includes(opt), () => togglePredefinedSource(opt), false),
          )}
          {customSources.map((opt) => renderPill(opt, true, () => removeCustomSource(opt), true))}
        </div>
        {renderCustomInput("Add custom source...", customSource, setCustomSource, addCustomSource)}
      </fieldset>
      <hr className="border-ut-border my-ut-2" />

      {/* Search Methods pill selector */}
      <fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
        <legend className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Search Methods
        </legend>
        <div className="flex flex-wrap gap-ut-1 mb-ut-1">
          {SEARCH_METHOD_OPTIONS.map((opt) =>
            renderPill(opt, currentMethods.includes(opt), () => togglePredefinedMethod(opt), false),
          )}
          {customMethods.map((opt) => renderPill(opt, true, () => removeCustomMethod(opt), true))}
        </div>
        {renderCustomInput("Add custom method...", customMethod, setCustomMethod, addCustomMethod)}
      </fieldset>
      <hr className="border-ut-border my-ut-2" />

      {/* Discipline pill selector */}
      <fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
        <legend className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Discipline
        </legend>
        <div className="flex flex-wrap gap-ut-1 mb-ut-1 max-h-48 overflow-y-auto">
          {DISCIPLINE_OPTIONS.map((opt) =>
            renderPill(
              opt,
              currentDisciplines.includes(opt),
              () => togglePredefinedDiscipline(opt),
              false,
            ),
          )}
          {customDisciplines.map((opt) =>
            renderPill(opt, true, () => removeCustomDiscipline(opt), true),
          )}
        </div>
        {renderCustomInput(
          "Add custom discipline...",
          customDiscipline,
          setCustomDiscipline,
          addCustomDiscipline,
        )}
      </fieldset>
      <hr className="border-ut-border my-ut-2" />
      {/* Authentication Method single-select pill selector */}
      <fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
        <legend className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Authentication Method
        </legend>
        <div className="flex flex-wrap gap-ut-1 mb-ut-1">
          {AUTH_METHOD_OPTIONS.map((opt) =>
            renderPill(
              opt,
              session.authenticationMethod === opt,
              () =>
                updateMetadata({
                  authenticationMethod: session.authenticationMethod === opt ? undefined : opt,
                }),
              false,
            ),
          )}
        </div>
      </fieldset>
      <hr className="border-ut-border my-ut-2" />
      {/* Review summary */}
      <div className="border-t-2 border-ut-border pt-ut-3 mt-1">
        <div className="flex justify-between text-ut-xs text-ut-muted font-mono mb-1">
          <span>Started</span>
          <span className="text-ut-text">{new Date(session.startTime).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-ut-xs text-ut-muted font-mono mb-1">
          <span>Captures</span>
          <span className={captures.length === 0 ? "text-state-warning" : "text-ut-text"}>
            {captures.length}
          </span>
        </div>
        <div className="flex justify-between text-ut-xs text-ut-muted font-mono mb-ut-3">
          <span>Scored items</span>
          <span className={scoredCount === 0 ? "text-state-warning" : "text-ut-text"}>
            {scoredCount}
          </span>
        </div>

        {captures.length === 0 && (
          <p className="text-ut-xs text-state-warning mb-ut-2">
            No captures — export will contain only metadata and scores.
          </p>
        )}
        {scoredCount === 0 && captures.length > 0 && (
          <p className="text-ut-xs text-state-warning mb-ut-2">
            No scores yet — export will contain only captures and metadata.
          </p>
        )}

        {!finalization && (
          <div className="border border-score-1/40 bg-score-1/5 rounded-ut-sm px-ut-3 py-ut-2 mb-ut-2">
            <p className="text-ut-xs text-score-1 font-heading font-bold uppercase tracking-ut-label">
              Review not finalized
            </p>
            <p className="text-ut-xs text-ut-muted mt-0.5">
              Conclusions will not be included in the report.
            </p>
            <button
              type="button"
              className="mt-1 text-ut-xs font-heading font-bold uppercase tracking-ut-label text-trust-magenta hover:text-trust-magenta-strong transition-colors"
              onClick={() => setActiveTab("Finalize")}
            >
              Finalize review &rarr;
            </button>
          </div>
        )}
        {finalization && (
          <p className="text-ut-xs text-ut-muted font-mono mb-ut-2">
            Finalized {new Date(finalization.finalizedAt).toLocaleString()}
          </p>
        )}

        <button
          type="button"
          className="w-full bg-trust-magenta text-white rounded-ut-sm px-ut-4 py-ut-3 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-trust-magenta-strong disabled:opacity-50 transition-colors"
          disabled={exporting}
          onClick={() => {
            const { ok } = canExport();
            if (ok) {
              handleExport();
            } else {
              setShowExportConfirm(true);
            }
          }}
        >
          {exporting ? "Exporting..." : "End Review & Export"}
        </button>

        <button
          type="button"
          className="w-full mt-ut-2 rounded-ut-sm px-ut-4 py-2 text-ut-sm transition-colors font-heading font-bold uppercase tracking-ut-uppercase text-ut-slate hover:text-ut-red"
          onClick={handleDiscardSession}
        >
          Discard review
        </button>
      </div>

      {showExportConfirm && (
        <ConfirmDialog
          message="Some required fields are missing. Export anyway?"
          actions={[
            {
              label: "Export anyway",
              handler: () => {
                setShowExportConfirm(false);
                handleExport();
              },
              variant: "danger",
            },
            {
              label: "Cancel",
              handler: () => setShowExportConfirm(false),
              variant: "cancel",
            },
          ]}
        />
      )}
      {showDiscardConfirm && (
        <ConfirmDialog
          message="This will permanently delete all captures, scores, and notes for this review."
          actions={[
            { label: "Cancel", handler: () => setShowDiscardConfirm(false), variant: "cancel" },
            {
              label: "Discard",
              handler: () => {
                deleteSession(session.id);
                setShowDiscardConfirm(false);
              },
              variant: "danger",
            },
          ]}
        />
      )}
      {showUsesAiConfirm && (
        <ConfirmDialog
          message="AI-specific questions have been scored. Disable AI and mark them as N/A?"
          actions={[
            {
              label: "Mark as N/A",
              handler: () => {
                clearAiOnlyScores();
                updateMetadata({ usesAi: false });
                setShowUsesAiConfirm(false);
              },
              variant: "danger",
            },
            {
              label: "Cancel",
              handler: () => {
                setShowUsesAiConfirm(false);
              },
              variant: "cancel",
            },
          ]}
        />
      )}
    </div>
  );
}
