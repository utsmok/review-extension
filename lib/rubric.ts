import type { RubricData } from './types';

export const TRUST_RUBRIC: RubricData = {
  framework_name: 'TRUST - UT Embedded Information Services',
  version: '1.0',
  quality_gate: {
    privacy_and_security: {
      data_privacy: {
        type: 'pass_fail',
        requirement:
          'Tool must comply with GDPR and SURF/institutional safety guidelines.',
      },
      training_policy: {
        type: 'pass_fail',
        requirement:
          'Vendor must explicitly state that user queries/inputs/uploads are NOT used to train future models.',
      },
    },
    traceability: {
      citation_mechanism: {
        type: 'pass_fail',
        requirement:
          'Tool must use verifiable, inline citations for every AI-generated claim.',
      },
    },
    accessibility: {
      compliance: {
        type: 'pass_fail',
        requirement:
          'Tool must meet baseline accessibility standards (e.g., WCAG 2.1) for university-wide recommendation.',
      },
    },
  },
  scoring_rubric: {
    T_transparent: {
      data_source_clarity: {
        '0': 'Sources are opaque/proprietary.',
        '1': 'General source types mentioned.',
        '2': 'Key databases/indices identified.',
        '3': 'Full corpus composition and API documentation provided.',
      },
      methodology_disclosure: {
        '0': 'Black box, no info.',
        '1': "Vague claims of 'AI'.",
        '2': 'Discloses model/architecture (e.g. LLM used) and RAG structure.',
        '3': 'Fully documented RAG/CoT reasoning process and parameter transparency.',
      },
    },
    R_reliable: {
      accuracy_and_hallucination: {
        '0': 'Frequent factual hallucinations.',
        '1': 'Occasional errors in synthesis.',
        '2': 'High accuracy, minor nuances missed.',
        '3': 'Virtually zero factual hallucinations in test battery.',
      },
      variance_consistency: {
        '0': 'Highly inconsistent results for identical prompts.',
        '1': 'Moderate variation requiring re-prompting.',
        '2': 'Consistent results with minor output variance.',
        '3': 'Highly reproducible results across test battery runs.',
      },
    },
    U_user_centric: {
      workflow_integration: {
        '0': 'Siloed, no export.',
        '1': 'Manual copy-paste only.',
        '2': 'Supports basic RIS/BibTeX exports.',
        '3': 'Seamless integration (e.g., direct Zotero/EndNote push, API hooks).',
      },
      cognitive_guardrails: {
        '0': 'Encourages passive automation bias.',
        '1': "Standard 'check sources' disclaimer.",
        '2': 'Forces engagement with source text before synthesis.',
        '3': 'Active GLAT support (Generative AI Literacy Tools) / UI prompts for critical analysis.',
      },
    },
    S_secure: {
      algorithmic_fairness: {
        '0': 'No evidence of bias mitigation.',
        '1': 'Acknowledges bias as a limitation.',
        '2': 'Proactive bias detection/reporting in source selection.',
        '3': 'Transparent reporting on algorithmic fairness and source diversity (e.g., geographic/language scope).',
      },
    },
    T_traceable: {
      source_attribution_depth: {
        '0': 'Broken or missing links.',
        '1': 'Links to journal landing pages only.',
        '2': 'Deep links to paper abstracts.',
        '3': 'Deep links to specific paragraphs or segments (RAG-level).',
      },
      bibliometric_credibility: {
        '0': 'Includes retracted/predatory sources.',
        '1': 'No filtering of source quality.',
        '2': 'Categorizes sources (Pre-print vs. Peer-reviewed).',
        '3': 'Provides nuanced context (e.g., retraction status, citation count, source type).',
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

export function getCategoryLabel(categoryId: string): string {
  const labels: Record<string, string> = {
    privacy_and_security: 'Privacy & Security',
    traceability: 'Traceability',
    accessibility: 'Accessibility',
    T_transparent: 'T — Transparent',
    R_reliable: 'R — Reliable',
    U_user_centric: 'U — User-Centric',
    S_secure: 'S — Secure',
    T_traceable: 'T — Traceable',
  };
  return labels[categoryId] ?? categoryId;
}
