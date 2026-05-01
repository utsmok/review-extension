import type { RubricData } from "./types";

export const TRUST_RUBRIC: RubricData = {
  framework_name: "TRUST - UT Embedded Information Services",
  version: "1.0",
  quality_gate: {
    privacy_and_security: {
      data_privacy: {
        type: "pass_fail",
        title: "Data privacy",
        requirement:
          "Tool must comply with GDPR and SURF/institutional safety guidelines.",
      },
      training_policy: {
        type: "pass_fail",
        title: "Training policy",
        requirement:
          "Vendor must explicitly state that user queries/inputs/uploads are NOT used to train future models.",
      },
    },
    traceability: {
      citation_mechanism: {
        type: "pass_fail",
        title: "Citation mechanism",
        requirement:
          "Tool must use verifiable, inline citations for every AI-generated claim.",
      },
    },
    accessibility: {
      compliance: {
        type: "pass_fail",
        title: "Compliance",
        requirement:
          "Tool must meet baseline accessibility standards (e.g., WCAG 2.1) for university-wide recommendation.",
      },
    },
  },
  scoring_rubric: {
    TR: {
      data_source_clarity: {
        title: "Data source clarity",
        "0": "Sources are opaque/proprietary.",
        "1": "General source types mentioned.",
        "2": "Key databases/indices identified.",
        "3": "Full corpus composition and API documentation provided.",
      },
      methodology_disclosure: {
        title: "Methodology disclosure",
        "0": "Black box, no info.",
        "1": "Vague claims of 'AI'.",
        "2": "Discloses model/architecture (e.g. LLM used) and RAG structure.",
        "3": "Fully documented RAG/CoT reasoning process and parameter transparency.",
      },
    },
    RE: {
      accuracy_and_hallucination: {
        title: "Accuracy and hallucination",
        "0": "Frequent factual hallucinations.",
        "1": "Occasional errors in synthesis.",
        "2": "High accuracy, minor nuances missed.",
        "3": "Virtually zero factual hallucinations in test battery.",
      },
      variance_consistency: {
        title: "Variance consistency",
        "0": "Highly inconsistent results for identical prompts.",
        "1": "Moderate variation requiring re-prompting.",
        "2": "Consistent results with minor output variance.",
        "3": "Highly reproducible results across test battery runs.",
      },
    },
    US: {
      workflow_integration: {
        title: "Workflow integration",
        "0": "Siloed, no export.",
        "1": "Manual copy-paste only.",
        "2": "Supports basic RIS/BibTeX exports.",
        "3": "Seamless integration (e.g., direct Zotero/EndNote push, API hooks).",
      },
      cognitive_guardrails: {
        title: "Cognitive guardrails",
        "0": "Encourages passive automation bias.",
        "1": "Standard 'check sources' disclaimer.",
        "2": "Forces engagement with source text before synthesis.",
        "3": "Active GLAT support (Generative AI Literacy Tools) / UI prompts for critical analysis.",
      },
    },
    SE: {
      algorithmic_fairness: {
        title: "Algorithmic fairness",
        "0": "No evidence of bias mitigation.",
        "1": "Acknowledges bias as a limitation.",
        "2": "Proactive bias detection/reporting in source selection.",
        "3": "Transparent reporting on algorithmic fairness and source diversity (e.g., geographic/language scope).",
      },
    },
    TC: {
      source_attribution_depth: {
        title: "Source attribution depth",
        "0": "Broken or missing links.",
        "1": "Links to journal landing pages only.",
        "2": "Deep links to paper abstracts.",
        "3": "Deep links to specific paragraphs or segments (RAG-level).",
      },
      bibliometric_credibility: {
        title: "Bibliometric credibility",
        "0": "Includes retracted/predatory sources.",
        "1": "No filtering of source quality.",
        "2": "Categorizes sources (Pre-print vs. Peer-reviewed).",
        "3": "Provides nuanced context (e.g., retraction status, citation count, source type).",
      },
    },
  },
};

export function getRubricQuestionIds(rubric: RubricData): string[] {
  const ids: string[] = [];
  for (const [category, questions] of Object.entries(rubric.quality_gate)) {
    for (const questionId of Object.keys(questions)) {
      ids.push(`${category}.${questionId}`);
    }
  }
  for (const [category, questions] of Object.entries(rubric.scoring_rubric)) {
    for (const questionId of Object.keys(questions)) {
      ids.push(`${category}.${questionId}`);
    }
  }
  return ids;
}

const CATEGORY_ORDER = ["TR", "RE", "US", "SE", "TC"];

export function getQuestionCode(categoryKey: string, questionIndex: number): string {
  return `${categoryKey}${questionIndex + 1}`;
}

export function getQuestionIndex(
  rubric: RubricData,
  categoryKey: string,
  questionId: string,
): number {
  const questions =
    rubric.scoring_rubric[categoryKey] ?? rubric.quality_gate[categoryKey];
  if (!questions) return 0;
  return Object.keys(questions).indexOf(questionId);
}

export function getAccentKey(categoryId: string): string {
  const map: Record<string, string> = {
    TR: "tr",
    RE: "re",
    US: "uc",
    SE: "se",
    TC: "tc",
  };
  return map[categoryId] ?? "control";
}

export function getCategoryLabel(categoryId: string): string {
  const labels: Record<string, string> = {
    privacy_and_security: "Privacy & Security",
    traceability: "Traceability",
    accessibility: "Accessibility",
    TR: "TR — Transparent",
    RE: "RE — Reliable",
    US: "US — User-Centric",
    SE: "SE — Secure",
    TC: "TC — Traceable",
  };
  return labels[categoryId] ?? categoryId;
}
