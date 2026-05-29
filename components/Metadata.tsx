import { useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { captureForMetadataField } from "@/lib/capture";
import { useRubric, useTabNavigation } from "@/lib/contexts";
import { toastError } from "@/stores/toast";
import ConfirmDialog from "./ConfirmDialog";
import ExportCompleteScreen from "./ExportCompleteScreen";
import PillField from "./PillField";

const MAX_TEXT_LENGTH = 500;
const MAX_URL_LENGTH = 2048;

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
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportFileSize, setExportFileSize] = useState<number | null>(null);
  const [showUsesAiConfirm, setShowUsesAiConfirm] = useState(false);
  const [logoCapturing, setLogoCapturing] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [tcCapturing, setTcCapturing] = useState(false);
  const [logoError, setLogoError] = useState(false);

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
    setExportError(null);
    const result = await exportAndClose(rubric);
    setExporting(false);
    if (result) {
      setExportFilename(`TRUST_Review_${session.toolName}.zip`);
      setExportFileSize(result.blobSize);
      setExportComplete(true);
    } else {
      setExportError("Export failed. Please try again.");
      setExportComplete(true);
    }
  };

  const handleRetry = async () => {
    setExporting(true);
    const result = await exportAndClose(rubric);
    setExporting(false);
    if (result) {
      setExportFilename(`TRUST_Review_${session.toolName}.zip`);
      setExportFileSize(result.blobSize);
      setExportError(null);
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
        error={exportError}
        fileSize={exportFileSize ?? undefined}
        loading={exporting}
        onRetry={handleRetry}
        onDone={handleDone}
      />
    );
  }

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
          className="meta-input border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text resize-y focus:outline-none focus:ring-2 focus:ring-ut-blue"
          rows={3}
          maxLength={MAX_TEXT_LENGTH}
          placeholder="General observations, context..."
          value={session.notes ?? ""}
          onChange={(e) => updateMetadata({ notes: e.target.value })}
        />
      </label>

      <label className="meta-toggle-label flex items-center gap-ut-2 min-h-[44px] cursor-pointer">
        <input
          {...(!(session.usesAi ?? true) ? { "aria-describedby": "desc-usesai" } : {})}
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
          className="meta-checkbox w-4 h-4 rounded-ut-sm border-ut-border text-ut-blue focus:ring-ut-blue"
        />
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Tool uses AI / LLM
        </span>
        {!(session.usesAi ?? true) && (
          <span className="meta-ai-badge text-ut-xs font-mono bg-ut-offwhite text-ut-muted border border-ut-border rounded-ut-sm px-ut-1 ml-auto">
            OFF
          </span>
        )}
        {(session.usesAi ?? true) && (
          <span className="meta-ai-badge text-ut-xs font-mono bg-state-success-tint text-ut-green border border-ut-green/30 rounded-ut-sm px-ut-1 ml-auto">
            ON
          </span>
        )}
      </label>
      {!(session.usesAi ?? true) && (
        <p id="desc-usesai" className="text-ut-xs text-ut-muted">
          AI-specific questions are marked as not applicable.
        </p>
      )}
      <hr className="border-ut-border my-ut-2" />

      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Tool Description
        </span>
        <input
          className="meta-input border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue overflow-hidden text-ellipsis"
          maxLength={MAX_TEXT_LENGTH}
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
          className="meta-input border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue overflow-hidden text-ellipsis"
          maxLength={MAX_TEXT_LENGTH}
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
            type="url"
            className="meta-input meta-url-input border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue flex-1 min-w-0 overflow-hidden text-ellipsis"
            maxLength={MAX_URL_LENGTH}
            placeholder="Paste logo image URL..."
            value={session.toolLogoUrl ?? ""}
            onChange={(e) => {
              updateMetadata({ toolLogoUrl: e.target.value });
              setLogoError(false);
            }}
          />
          {session?.toolLogoUrl && !logoError && (
            <img
              src={session.toolLogoUrl}
              alt="Logo"
              className="meta-logo-img"
              onError={() => setLogoError(true)}
            />
          )}
          {session?.toolLogoUrl && logoError && (
            <span
              className="meta-logo-img text-ut-xs text-state-warning flex items-center justify-center"
              title="Image failed to load"
            >
              ⚠
            </span>
          )}
        </div>
        {(() => {
          const linkedCapture = captures.find((c) => c.metadataField === "toolLogoUrl");
          return (
            <div className="meta-capture-panel">
              {linkedCapture ? (
                <div className="meta-capture-item">
                  <a
                    href={linkedCapture.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                    title={linkedCapture.sourceUrl}
                  >
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
          className="meta-input border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue overflow-hidden text-ellipsis"
          maxLength={MAX_TEXT_LENGTH}
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
          className="meta-input border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue overflow-hidden text-ellipsis"
          maxLength={MAX_TEXT_LENGTH}
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
          type="url"
          className="meta-input meta-url-input border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue overflow-hidden text-ellipsis"
          maxLength={MAX_URL_LENGTH}
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
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                        title={c.sourceUrl}
                      >
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
      <PillField
        label="Data Sources"
        options={DATA_SOURCE_OPTIONS}
        selected={session.dataSources ?? []}
        onChange={(next) => updateMetadata({ dataSources: next })}
        placeholder="Add custom source..."
      />
      <hr className="border-ut-border my-ut-2" />

      {/* Search Methods pill selector */}
      <PillField
        label="Search Methods"
        options={SEARCH_METHOD_OPTIONS}
        selected={session.searchMethods ?? []}
        onChange={(next) => updateMetadata({ searchMethods: next })}
        placeholder="Add custom method..."
      />
      <hr className="border-ut-border my-ut-2" />

      {/* Discipline pill selector */}
      <PillField
        label="Discipline"
        options={DISCIPLINE_OPTIONS}
        selected={Array.isArray(session.discipline) ? session.discipline : []}
        onChange={(next) => updateMetadata({ discipline: next })}
        placeholder="Add custom discipline..."
        maxHeight="max-h-48 overflow-y-auto"
      />
      <hr className="border-ut-border my-ut-2" />

      {/* Authentication Method single-select pill selector */}
      <PillField
        label="Authentication Method"
        options={AUTH_METHOD_OPTIONS}
        selected={session.authenticationMethod ? [session.authenticationMethod] : []}
        onChange={(next) => updateMetadata({ authenticationMethod: next[0] ?? undefined })}
        allowCustom={false}
        single
      />
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
