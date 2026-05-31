/**
 * Static analysis metrics for TRUST rubric content.
 *
 * No LLM needed — pure text analysis:
 * 1. Word count & balance per score level
 * 2. Background structure (instructional ratio, N/A conditions)
 * 3. Behavioral grounding heuristic (pattern matching)
 * 4. Example coverage (all expected levels present)
 */

import type {
  RubricData,
  QualityGateQuestion,
  ScoringQuestion,
  QuestionRef,
  QuestionMeasurement,
  BackgroundMetrics,
  BalanceMetrics,
  BehavioralGroundingMetrics,
  ExampleCoverageMetrics,
  MetricFlag,
  MeasurementReport,
} from "./types.ts";

// ── Helpers ──

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// Imperative verbs that signal instructional/evaluative content
const INSTRUCTIONAL_PATTERNS = [
  /\blook for\b/i,
  /\btest\b/i,
  /\breview\b/i,
  /\bcheck\b/i,
  /\bsearch\b/i,
  /\bverify\b/i,
  /\bcompare\b/i,
  /\bevaluate\b/i,
  /\brun\b/i,
  /\bclick\b/i,
  /\bnavigate\b/i,
  /\bexamine\b/i,
  /\binspect\b/i,
  /\bask\b/i,
  /\bnote\b/i,
  /\bquery\b/i,
  /\btry\b/i,
  /\battempt\b/i,
  /\bdocument\b/i,
  /\brecord\b/i,
  /\bobserve\b/i,
  /\bpay attention\b/i,
  /\bwatch for\b/i,
];

// Abstract quality terms that suggest NON-behavioral descriptions
const ABSTRACT_QUALITY_TERMS = [
  "good",
  "bad",
  "poor",
  "great",
  "excellent",
  "terrible",
  "adequate",
  "inadequate",
  "reasonable",
  "unreasonable",
  "satisfactory",
  "unsatisfactory",
  "acceptable",
  "unacceptable",
  "comprehensive",
  "thorough",
  "limited",
  "extensive",
  "strong",
  "weak",
  "robust",
  "minimal",
  "significant",
  "insignificant",
  "appropriate",
  "inappropriate",
  "effective",
  "ineffective",
  "quality",
  "high quality",
  "low quality",
];

// Behavioral indicators — concrete observable actions or states
const BEHAVIORAL_INDICATORS = [
  /\b(link|links|linked)\b/i,
  /\b(state|states|stated|states:)\b/i,
  /\b(show|shows|shown|display|displays|displays:)\b/i,
  /\b(list|lists|listed|lists:)\b/i,
  /\b(provide|provides|provided)\b/i,
  /\b(include|includes|included)\b/i,
  /\b(support|supports)\b/i,
  /\b(export|exports)\b/i,
  /\b(navigate|navigated|navigation)\b/i,
  /\b(click|clicking|clicked)\b/i,
  /\b(api|doi|url|http)\b/i,
  /\b(bibtex|ris|csv|pdf)\b/i,
  /\bencrypt/i,
  /\b(retain|retained|retention)\b/i,
  /\b(delet|delete|deleting)\b/i,
  /\b(aes-|tls|ssl)\b/i,
  /\bflag/i,
  /\blabel/i,
  /\bbadge/i,
  /\bwarning/i,
  /\bfilter/i,
  /\bpubmed|scopus|arxiv|ieee\b/i,
  /\b\d{4}\b/, // Years — concrete dates
  /\b(page|pages|section|footer|header|menu|button)\b/i,
  /\b(cite|cited|citation|citations)\b/i,
  /\b(paper|papers|article|articles|journal)\b/i,
  /\b(publish|published|publishes)\b/i,
];

// ── Background analysis ──

function analyzeBackground(text: string): BackgroundMetrics {
  const wc = wordCount(text);

  // Split into sentences
  const sentences = text
    .split(/[.!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  // Count instructional sentences (contain imperative verbs)
  let instructionCount = 0;
  let instructionalWords = 0;
  for (const sentence of sentences) {
    const isInstructional = INSTRUCTIONAL_PATTERNS.some((p) => p.test(sentence));
    if (isInstructional) {
      instructionCount++;
      instructionalWords += wordCount(sentence);
    }
  }

  // Check for N/A conditions
  const hasNAConditions =
    /\bN\/A\b/i.test(text) ||
    /\bnot applicable\b/i.test(text) ||
    /\bdoes not apply\b/i.test(text) ||
    /\bmay be considered\b/i.test(text) ||
    /\bonly (applies|relevant)\b/i.test(text);

  return {
    wordCount: wc,
    instructionalRatio: wc > 0 ? instructionalWords / wc : 0,
    hasNAConditions,
    instructionCount,
  };
}

// ── Score level balance ──

function analyzeBalance(question: ScoringQuestion): BalanceMetrics {
  const levels: Array<{ level: string; wordCount: number; charCount: number }> = [];
  for (const lv of ["0", "1", "2", "3"] as const) {
    const text = question[lv];
    levels.push({
      level: lv,
      wordCount: wordCount(text),
      charCount: text.length,
    });
  }

  const averageWordCount = levels.reduce((sum, l) => sum + l.wordCount, 0) / levels.length;
  const minRatio =
    averageWordCount > 0 ? Math.min(...levels.map((l) => l.wordCount)) / averageWordCount : 0;
  const maxRatio =
    averageWordCount > 0 ? Math.max(...levels.map((l) => l.wordCount)) / averageWordCount : 0;

  return {
    levels,
    averageWordCount,
    minRatio,
    maxRatio,
    isBalanced: minRatio >= 0.5 && maxRatio <= 2.0,
  };
}

// ── Behavioral grounding heuristic ──

function analyzeBehavioralGrounding(question: ScoringQuestion): BehavioralGroundingMetrics {
  const levels: BehavioralGroundingMetrics["levels"] = [];

  for (const lv of ["0", "1", "2", "3"] as const) {
    const text = question[lv];

    // Count behavioral indicators
    const behavioralHits = BEHAVIORAL_INDICATORS.filter((p) => p.test(text)).length;

    // Count abstract quality terms (negative signal)
    const lowerText = text.toLowerCase();
    const abstractHits = ABSTRACT_QUALITY_TERMS.filter((term) => lowerText.includes(term)).length;

    // Heuristic: behavioral if > 1 concrete indicator OR concrete > abstract
    const isBehavioral = behavioralHits > 1 || behavioralHits > abstractHits;

    let reason: string;
    if (isBehavioral) {
      reason = `${behavioralHits} behavioral indicators, ${abstractHits} abstract terms`;
    } else {
      reason = `Only ${behavioralHits} behavioral indicators vs ${abstractHits} abstract terms`;
    }

    levels.push({ level: lv, isBehavioral, reason });
  }

  const behavioralFraction = levels.filter((l) => l.isBehavioral).length / levels.length;

  return {
    levels,
    behavioralFraction,
    passes: behavioralFraction >= 0.8,
  };
}

// ── Example coverage ──

function analyzeExampleCoverage(question: ScoringQuestion): ExampleCoverageMetrics {
  const expectedLevels = ["0", "1", "2", "3"];
  const presentLevels = Object.keys(question.examples || {});
  const missingLevels = expectedLevels.filter((l) => !presentLevels.includes(l));

  return {
    expectedLevels,
    presentLevels,
    missingLevels,
    isComplete: missingLevels.length === 0,
  };
}

// ── Flag generation ──

function generateFlags(
  ref: QuestionRef,
  bg: BackgroundMetrics,
  balance: BalanceMetrics,
  grounding: BehavioralGroundingMetrics,
  examples: ExampleCoverageMetrics,
): MetricFlag[] {
  const flags: MetricFlag[] = [];
  const key = `${ref.principle}.${ref.questionKey}`;

  // Background too long
  if (bg.wordCount > 200) {
    flags.push({
      severity: "warning",
      metric: "background.length",
      message: `${key}: Background is ${bg.wordCount} words (target ≤150, hard limit 200)`,
    });
  } else if (bg.wordCount > 150) {
    flags.push({
      severity: "info",
      metric: "background.length",
      message: `${key}: Background is ${bg.wordCount} words (target ≤150)`,
    });
  }

  // Background lacks instructional content
  if (bg.instructionalRatio < 0.2) {
    flags.push({
      severity: "warning",
      metric: "background.instructions",
      message: `${key}: Only ${Math.round(bg.instructionalRatio * 100)}% instructional content (target ≥20%). Instruction count: ${bg.instructionCount}`,
    });
  }

  // Background missing N/A conditions
  if (!bg.hasNAConditions) {
    flags.push({
      severity: "info",
      metric: "background.na_conditions",
      message: `${key}: No N/A conditions documented`,
    });
  }

  // Balance issues
  if (!balance.isBalanced) {
    if (balance.minRatio < 0.3) {
      flags.push({
        severity: "fail",
        metric: "score.balance",
        message: `${key}: Severely unbalanced score descriptions (min ratio ${balance.minRatio.toFixed(2)})`,
      });
    } else if (balance.minRatio < 0.5 || balance.maxRatio > 2.0) {
      flags.push({
        severity: "warning",
        metric: "score.balance",
        message: `${key}: Unbalanced score descriptions (min ${balance.minRatio.toFixed(2)}, max ${balance.maxRatio.toFixed(2)})`,
      });
    }
  }

  // Behavioral grounding
  if (!grounding.passes) {
    const nonBehavioral = grounding.levels.filter((l) => !l.isBehavioral).map((l) => l.level);
    flags.push({
      severity: "warning",
      metric: "score.behavioral",
      message: `${key}: Levels ${nonBehavioral.join(", ")} are not behaviorally grounded (${Math.round(grounding.behavioralFraction * 100)}% behavioral, target ≥80%)`,
    });
  }

  // Example coverage
  if (!examples.isComplete) {
    flags.push({
      severity: "warning",
      metric: "examples.coverage",
      message: `${key}: Missing examples for levels: ${examples.missingLevels.join(", ")}`,
    });
  }

  return flags;
}

// ── Quality gate question analysis ──

function analyzeQualityGateQuestion(
  ref: QuestionRef,
  question: QualityGateQuestion,
): QuestionMeasurement {
  const bg = analyzeBackground(question.background);

  // QGs have pass/fail, not scored levels — create a simplified balance metric
  const passLen = wordCount(question.examples?.pass ?? "");
  const failLen = wordCount(question.examples?.fail ?? "");
  const avgLen = (passLen + failLen) / 2;

  const balance: BalanceMetrics = {
    levels: [
      { level: "pass", wordCount: passLen, charCount: question.examples?.pass?.length ?? 0 },
      { level: "fail", wordCount: failLen, charCount: question.examples?.fail?.length ?? 0 },
    ],
    averageWordCount: avgLen,
    minRatio: avgLen > 0 ? Math.min(passLen, failLen) / avgLen : 0,
    maxRatio: avgLen > 0 ? Math.max(passLen, failLen) / avgLen : 0,
    isBalanced: avgLen > 0 && Math.min(passLen, failLen) / Math.max(passLen, failLen) > 0.5,
  };

  // Behavioral grounding for the requirement text
  const reqText = question.requirement;
  const behavioralHits = BEHAVIORAL_INDICATORS.filter((p) => p.test(reqText)).length;
  const lowerReq = reqText.toLowerCase();
  const abstractHits = ABSTRACT_QUALITY_TERMS.filter((t) => lowerReq.includes(t)).length;
  const isReqBehavioral = behavioralHits > 1 || behavioralHits > abstractHits;

  const grounding: BehavioralGroundingMetrics = {
    levels: [
      {
        level: "requirement",
        isBehavioral: isReqBehavioral,
        reason: `${behavioralHits} behavioral, ${abstractHits} abstract`,
      },
    ],
    behavioralFraction: isReqBehavioral ? 1 : 0,
    passes: isReqBehavioral,
  };

  // Example coverage for quality gates
  const expectedLevels = ["pass", "fail"];
  const presentLevels = Object.keys(question.examples || {});
  const missingLevels = expectedLevels.filter((l) => !presentLevels.includes(l));

  const examples: ExampleCoverageMetrics = {
    expectedLevels,
    presentLevels,
    missingLevels,
    isComplete: missingLevels.length === 0,
  };

  const flags = generateFlags(ref, bg, balance, grounding, examples);

  return { ref, background: bg, balance, heuristicGrounding: grounding, examples, flags };
}

// ── Scoring question analysis ──

function analyzeScoringQuestion(ref: QuestionRef, question: ScoringQuestion): QuestionMeasurement {
  const bg = analyzeBackground(question.background);
  const balance = analyzeBalance(question);
  const grounding = analyzeBehavioralGrounding(question);
  const examples = analyzeExampleCoverage(question);
  const flags = generateFlags(ref, bg, balance, grounding, examples);

  return { ref, background: bg, balance, heuristicGrounding: grounding, examples, flags };
}

// ── Public API: measure all questions ──

export function measureRubric(rubric: RubricData): MeasurementReport {
  const questions: QuestionMeasurement[] = [];

  // Quality gates
  for (const [group, items] of Object.entries(rubric.quality_gate)) {
    for (const [key, question] of Object.entries(items)) {
      const ref: QuestionRef = {
        kind: "quality_gate",
        principle: group,
        questionKey: key,
        title: question.title,
      };
      questions.push(analyzeQualityGateQuestion(ref, question));
    }
  }

  // Scoring questions
  for (const [principle, items] of Object.entries(rubric.scoring_rubric)) {
    for (const [key, question] of Object.entries(items)) {
      const ref: QuestionRef = {
        kind: "scoring",
        principle,
        questionKey: key,
        title: question.title,
      };
      questions.push(analyzeScoringQuestion(ref, question));
    }
  }

  // Summary
  const allFlags = questions.flatMap((q) => q.flags);
  const flagsBySeverity: Record<string, number> = {};
  for (const f of allFlags) {
    flagsBySeverity[f.severity] = (flagsBySeverity[f.severity] || 0) + 1;
  }

  const weakest = [...questions]
    .sort((a, b) => b.flags.length - a.flags.length)
    .slice(0, 5)
    .map((q) => `${q.ref.principle}.${q.ref.questionKey}`);

  const scoringQuestions = questions.filter((q) => q.ref.kind === "scoring");
  const avgBgWords =
    scoringQuestions.length > 0
      ? scoringQuestions.reduce((s, q) => s + q.background.wordCount, 0) / scoringQuestions.length
      : 0;
  const avgBalance =
    scoringQuestions.length > 0
      ? scoringQuestions.reduce((s, q) => s + (q.balance.isBalanced ? 1 : 0), 0) /
        scoringQuestions.length
      : 0;
  const avgBehavioral =
    scoringQuestions.length > 0
      ? scoringQuestions.reduce((s, q) => s + q.heuristicGrounding.behavioralFraction, 0) /
        scoringQuestions.length
      : 0;

  return {
    timestamp: new Date().toISOString(),
    rubricId: rubric.id,
    rubricVersion: rubric.version,
    questions,
    summary: {
      totalQuestions: questions.length,
      totalFlags: allFlags.length,
      flagsBySeverity,
      weakestQuestions: weakest,
      averageBackgroundWords: Math.round(avgBgWords),
      averageBalanceRatio: Math.round(avgBalance * 100),
      averageBehavioralFraction: Math.round(avgBehavioral * 100),
    },
  };
}

// ── Formatting ──

export function formatReport(report: MeasurementReport): string {
  const lines: string[] = [];

  lines.push(`# TRUST Rubric Measurement Report`);
  lines.push(`Generated: ${report.timestamp}`);
  lines.push(`Rubric: ${report.rubricId} v${report.rubricVersion}`);
  lines.push("");

  // Summary
  lines.push(`## Summary`);
  lines.push(`- Questions analyzed: ${report.summary.totalQuestions}`);
  lines.push(`- Total flags: ${report.summary.totalFlags}`);
  const sev = report.summary.flagsBySeverity;
  lines.push(`  - Fail: ${sev.fail || 0}, Warning: ${sev.warning || 0}, Info: ${sev.info || 0}`);
  lines.push(`- Average background length: ${report.summary.averageBackgroundWords} words`);
  lines.push(`- Score balance: ${report.summary.averageBalanceRatio}% of questions balanced`);
  lines.push(`- Behavioral grounding: ${report.summary.averageBehavioralFraction}% average`);
  lines.push("");

  // Weakest questions
  lines.push(`## Weakest Questions (by flag count)`);
  for (const key of report.summary.weakestQuestions) {
    const q = report.questions.find((q) => `${q.ref.principle}.${q.ref.questionKey}` === key);
    if (q) {
      lines.push(`1. **${key}** ("${q.ref.title}") — ${q.flags.length} flags`);
    }
  }
  lines.push("");

  // Per-question details
  lines.push(`## Per-Question Details`);

  // Quality gates first
  const qgs = report.questions.filter((q) => q.ref.kind === "quality_gate");
  if (qgs.length > 0) {
    lines.push(`### Quality Gates`);
    for (const q of qgs) {
      lines.push("");
      lines.push(`#### ${q.ref.principle}.${q.ref.questionKey} — "${q.ref.title}"`);
      lines.push(
        `- Background: ${q.background.wordCount} words, ${Math.round(q.background.instructionalRatio * 100)}% instructional`,
      );
      lines.push(`- N/A conditions: ${q.background.hasNAConditions ? "yes" : "NO"}`);
      lines.push(
        `- Examples: ${q.examples.presentLevels.join(", ")}${q.examples.isComplete ? "" : ` (missing: ${q.examples.missingLevels.join(", ")})`}`,
      );
      if (q.flags.length > 0) {
        lines.push(`- **Flags:**`);
        for (const f of q.flags) {
          lines.push(`  - [${f.severity.toUpperCase()}] ${f.message}`);
        }
      } else {
        lines.push(`- No flags`);
      }
    }
  }

  // Scoring questions
  const scored = report.questions.filter((q) => q.ref.kind === "scoring");
  if (scored.length > 0) {
    lines.push("");
    lines.push(`### Scoring Questions`);
    for (const q of scored) {
      lines.push("");
      lines.push(`#### ${q.ref.principle}.${q.ref.questionKey} — "${q.ref.title}"`);
      lines.push(
        `- Background: ${q.background.wordCount} words, ${Math.round(q.background.instructionalRatio * 100)}% instructional, ${q.background.instructionCount} instruction sentences`,
      );
      lines.push(`- N/A conditions: ${q.background.hasNAConditions ? "yes" : "NO"}`);
      lines.push(
        `- Balance: avg ${q.balance.averageWordCount.toFixed(0)} words/level, ratio ${q.balance.minRatio.toFixed(2)}–${q.balance.maxRatio.toFixed(2)} (${q.balance.isBalanced ? "balanced" : "UNBALANCED"})`,
      );
      const gl = q.heuristicGrounding.levels;
      lines.push(
        `- Behavioral: ${Math.round(q.heuristicGrounding.behavioralFraction * 100)}% — ${gl.map((l) => `${l.level}:${l.isBehavioral ? "✓" : "✗"}`).join(" ")}`,
      );
      lines.push(
        `- Examples: ${q.examples.presentLevels.join(", ")}${q.examples.isComplete ? "" : ` (missing: ${q.examples.missingLevels.join(", ")})`}`,
      );
      if (q.flags.length > 0) {
        lines.push(`- **Flags:**`);
        for (const f of q.flags) {
          lines.push(`  - [${f.severity.toUpperCase()}] ${f.message}`);
        }
      } else {
        lines.push(`- No flags`);
      }
    }
  }

  return lines.join("\n");
}
